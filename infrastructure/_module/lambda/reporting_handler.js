const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Pool } = require("pg");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Cache the database connection and credentials
let dbPool = null;
let dbCredentials = null;
const s3Client = new S3Client();

// Get database credentials from Secrets Manager
async function getDbCredentials() {
    if (dbCredentials) {
        return dbCredentials;
    }

    const client = new SecretsManagerClient();
    const command = new GetSecretValueCommand({
        SecretId: process.env.DB_SECRET_ARN,
    });

    try {
        const response = await client.send(command);
        dbCredentials = JSON.parse(response.SecretString);
        return dbCredentials;
    } catch (error) {
        console.error("Error fetching database credentials:", error);
        throw error;
    }
}

// Get or create database connection pool
async function getDbPool() {
    if (dbPool) {
        return dbPool;
    }

    const credentials = await getDbCredentials();

    dbPool = new Pool({
        host: credentials.host,
        port: credentials.port,
        database: credentials.dbname,
        user: credentials.username,
        password: credentials.password,
        ssl: {
            rejectUnauthorized: false
        },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    return dbPool;
}

// Upload file to S3
async function uploadToS3(buffer, filename, contentType) {
    const bucket = process.env.REPORTS_BUCKET || process.env.KNOWLEDGE_BASE_BUCKET;
    const key = `reports/${filename}`;

    // Upload the file to S3
    const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3Client.send(putCommand);

    // Generate a presigned URL that expires in 7 days (604800 seconds)
    const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 604800, // 7 days
    });

    return presignedUrl;
}

// Format date for display
function formatDate(date) {
    return new Date(date).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Fetch report data from database
async function fetchReportData(pool, startDate, endDate, filters = {}) {
    const { childId, eventType, category } = filters;

    // Query child events
    let eventsQuery = `
    SELECT 
      e.id, e.name, e."eventType", e."childId",
      e."createdAt", e."updatedAt",
      c."firstName", c."lastName"
    FROM "child-events" e
    LEFT JOIN "child-details" c ON e."childId" = c.id
    WHERE e."createdAt" >= $1 AND e."createdAt" <= $2
  `;

    // Query bookings
    let bookingsQuery = `
    SELECT 
      b.id, b.name, b.date, b.time, b.notes,
      b."userId", b."childId", b."createdAt",
      c."firstName", c."lastName", c."dateOfBirth",
      u.name as user_name, u.email as user_email
    FROM bookings b
    LEFT JOIN "child-details" c ON b."childId" = c.id
    LEFT JOIN "User" u ON b."userId" = u.id
    WHERE b.date >= $1 AND b.date <= $2
  `;

    // Query children with their booking/event counts
    let childrenQuery = `
    SELECT 
      c.id, c."firstName", c."lastName", c."dateOfBirth",
      c.gender, c.allergies, c."medicalInfo", c.notes,
      c."signedIn", c."bookedIn",
      COUNT(DISTINCT b.id) as total_bookings,
      COUNT(DISTINCT e.id) as total_events
    FROM "child-details" c
    LEFT JOIN bookings b ON c.id = b."childId" AND b.date >= $1 AND b.date <= $2
    LEFT JOIN "child-events" e ON c.id = e."childId" AND e."createdAt" >= $1 AND e."createdAt" <= $2
    WHERE 1=1
  `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (childId) {
        eventsQuery += ` AND e."childId" = $${paramIndex}`;
        bookingsQuery += ` AND b."childId" = $${paramIndex}`;
        childrenQuery += ` AND c.id = $${paramIndex}`;
        params.push(childId);
        paramIndex++;
    }

    if (eventType) {
        eventsQuery += ` AND e."eventType" = $${paramIndex}`;
        params.push(eventType);
        paramIndex++;
    }

    eventsQuery += ` ORDER BY e."createdAt" DESC`;
    bookingsQuery += ` ORDER BY b.date, b.time`;
    childrenQuery += ` GROUP BY c.id ORDER BY c."firstName", c."lastName"`;

    const [events, bookings, children] = await Promise.all([
        category === "bookings" || category === "children" ? { rows: [] } : pool.query(eventsQuery, params),
        category === "events" ? { rows: [] } : pool.query(bookingsQuery, params),
        category === "events" || category === "bookings" ? { rows: [] } : pool.query(childrenQuery, params),
    ]);

    return {
        events: events.rows || [],
        bookings: bookings.rows || [],
        children: children.rows || [],
    };
}

// Generate Excel report
async function generateExcelReport(data, reportType, dateRange) {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Child Event Manager";
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", key: "value", width: 20 },
    ];

    summarySheet.addRow({ metric: "Report Type", value: reportType });
    summarySheet.addRow({ metric: "Date Range", value: `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` });
    summarySheet.addRow({ metric: "Total Events", value: data.events.length });
    summarySheet.addRow({ metric: "Total Bookings", value: data.bookings.length });
    summarySheet.addRow({ metric: "Total Children", value: data.children.length });

    // Style the header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
    };

    // Events Sheet
    if (data.events.length > 0) {
        const eventsSheet = workbook.addWorksheet("Events");
        eventsSheet.columns = [
            { header: "Event Name", key: "name", width: 30 },
            { header: "Event Type", key: "type", width: 20 },
            { header: "Child Name", key: "childName", width: 25 },
            { header: "Created At", key: "createdAt", width: 20 },
        ];

        data.events.forEach(event => {
            eventsSheet.addRow({
                name: event.name,
                type: event.eventType,
                childName: `${event.firstName || ""} ${event.lastName || ""}`.trim() || "N/A",
                createdAt: formatDate(event.createdAt),
            });
        });

        eventsSheet.getRow(1).font = { bold: true };
        eventsSheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
        };
    }

    // Bookings Sheet
    if (data.bookings.length > 0) {
        const bookingsSheet = workbook.addWorksheet("Bookings");
        bookingsSheet.columns = [
            { header: "Date", key: "date", width: 12 },
            { header: "Time", key: "time", width: 10 },
            { header: "Booking Name", key: "name", width: 30 },
            { header: "Child Name", key: "childName", width: 25 },
            { header: "User Name", key: "userName", width: 20 },
            { header: "Notes", key: "notes", width: 30 },
        ];

        data.bookings.forEach(booking => {
            bookingsSheet.addRow({
                date: formatDate(booking.date),
                time: booking.time,
                name: booking.name,
                childName: booking.firstName ? `${booking.firstName} ${booking.lastName || ""}` : "N/A",
                userName: booking.user_name || "N/A",
                notes: booking.notes || "",
            });
        });

        bookingsSheet.getRow(1).font = { bold: true };
        bookingsSheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
        };
    }

    // Children Sheet
    if (data.children.length > 0) {
        const childrenSheet = workbook.addWorksheet("Children");
        childrenSheet.columns = [
            { header: "First Name", key: "firstName", width: 20 },
            { header: "Last Name", key: "lastName", width: 20 },
            { header: "Date of Birth", key: "dob", width: 15 },
            { header: "Total Bookings", key: "totalBookings", width: 15 },
            { header: "Attended", key: "attended", width: 12 },
        ];

        data.children.forEach(child => {
            childrenSheet.addRow({
                firstName: child.firstName,
                lastName: child.lastName || "",
                dob: child.dateOfBirth ? formatDate(child.dateOfBirth) : "N/A",
                totalBookings: child.total_bookings,
                attended: child.total_events || 0,
            });
        });

        childrenSheet.getRow(1).font = { bold: true };
        childrenSheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
        };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

// Generate CSV report
async function generateCSVReport(data, reportType) {
    let csv = "";

    // Events CSV
    if (data.events.length > 0) {
        csv += "EVENTS\n";
        csv += "Event Name,Event Type,Child Name,Created At\n";
        data.events.forEach(event => {
            const childName = `${event.firstName || ""} ${event.lastName || ""}`.trim() || "N/A";
            csv += `"${event.name}",${event.eventType},"${childName}",${formatDate(event.createdAt)}\n`;
        });
        csv += "\n";
    }

    // Bookings CSV
    if (data.bookings.length > 0) {
        csv += "BOOKINGS\n";
        csv += "Date,Time,Booking Name,Child Name,User Name,Notes\n";
        data.bookings.forEach(booking => {
            const childName = booking.firstName ? `${booking.firstName} ${booking.lastName || ""}` : "N/A";
            csv += `${formatDate(booking.date)},${booking.time},"${booking.name}","${childName}","${booking.user_name || "N/A"}","${booking.notes || ""}"\n`;
        });
        csv += "\n";
    }

    // Children CSV
    if (data.children.length > 0) {
        csv += "CHILDREN\n";
        csv += "First Name,Last Name,Date of Birth,Total Bookings,Attended\n";
        data.children.forEach(child => {
            csv += `"${child.firstName}","${child.lastName || ""}",${child.dateOfBirth ? formatDate(child.dateOfBirth) : "N/A"},${child.total_bookings},${child.total_events || 0}\n`;
        });
    }

    return Buffer.from(csv, "utf-8");
}

// Generate PDF report
async function generatePDFReport(data, reportType, dateRange) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on("data", chunk => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Title
        doc.fontSize(20).text("Child Event Manager Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Report Type: ${reportType}`, { align: "center" });
        doc.text(`Date Range: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, { align: "center" });
        doc.moveDown();

        // Summary
        doc.fontSize(14).text("Summary", { underline: true });
        doc.fontSize(10);
        doc.text(`Total Events: ${data.events.length}`);
        doc.text(`Total Bookings: ${data.bookings.length}`);
        doc.text(`Total Children: ${data.children.length}`);
        doc.moveDown();

        // Events
        if (data.events.length > 0) {
            doc.fontSize(14).text("Events", { underline: true });
            doc.fontSize(9);

            data.events.slice(0, 20).forEach((event, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }
                const childName = `${event.firstName || ""} ${event.lastName || ""}`.trim() || "N/A";
                doc.text(`${index + 1}. ${event.name} (${event.eventType})`);
                doc.text(`   Child: ${childName}, Created: ${formatDate(event.createdAt)}`);
            });

            if (data.events.length > 20) {
                doc.text(`... and ${data.events.length - 20} more events`);
            }
            doc.moveDown();
        }

        // Bookings
        if (data.bookings.length > 0) {
            if (doc.y > 600) {
                doc.addPage();
            }
            doc.fontSize(14).text("Bookings", { underline: true });
            doc.fontSize(9);

            data.bookings.slice(0, 20).forEach((booking, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }
                const childName = booking.firstName ? `${booking.firstName} ${booking.lastName || ""}` : "N/A";
                doc.text(`${index + 1}. ${booking.name} - ${childName}`);
                doc.text(`   Date: ${formatDate(booking.date)}, Time: ${booking.time}`);
            });

            if (data.bookings.length > 20) {
                doc.text(`... and ${data.bookings.length - 20} more bookings`);
            }
        }

        doc.end();
    });
}

// Main handler
exports.handler = async (event) => {
    console.log("Reporting Handler - Event:", JSON.stringify(event, null, 2));

    try {
        const pool = await getDbPool();

        // Parse the action and parameters
        const actionGroup = event.actionGroup;
        const apiPath = event.apiPath;
        
        // Parameters can be in event.parameters OR event.requestBody.content['application/json'].properties
        let parameters = event.parameters || [];
        
        // Check if parameters are in requestBody instead
        if (parameters.length === 0 && event.requestBody?.content?.['application/json']?.properties) {
            parameters = event.requestBody.content['application/json'].properties;
        }

        // Convert parameters array to object
        const params = {};
        parameters.forEach(param => {
            params[param.name] = param.value;
        });

        console.log("Action:", apiPath);
        console.log("Parameters:", params);

        let response;

        switch (apiPath) {
            case "/generate-daily-report":
            case "/generate-weekly-report":
            case "/generate-monthly-report":
            case "/generate-custom-report":
            case "/generate-children-report":
            case "/generate-event-report": {
                const { userId, format, childId, eventType, category } = params;
                let startDate, endDate, reportType;

                // Determine date range based on report type
                if (apiPath === "/generate-daily-report") {
                    startDate = endDate = params.date;
                    reportType = "Daily Report";
                } else if (apiPath === "/generate-weekly-report") {
                    startDate = params.startDate;
                    endDate = params.endDate;
                    reportType = "Weekly Report";
                } else if (apiPath === "/generate-monthly-report") {
                    const year = parseInt(params.year);
                    const month = parseInt(params.month);
                    startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                    const lastDay = new Date(year, month, 0).getDate();
                    endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
                    reportType = "Monthly Report";
                } else {
                    startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                    endDate = params.endDate || new Date().toISOString().split("T")[0];
                    reportType = apiPath.includes("children") ? "Children Report" :
                        apiPath.includes("event") ? "Event Report" : "Custom Report";
                }

                // Fetch data
                const data = await fetchReportData(pool, startDate, endDate, { childId, eventType, category });

                // Generate report based on format
                let buffer, contentType, extension;

                if (format === "excel") {
                    buffer = await generateExcelReport(data, reportType, { start: startDate, end: endDate });
                    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    extension = "xlsx";
                } else if (format === "csv") {
                    buffer = await generateCSVReport(data, reportType);
                    contentType = "text/csv";
                    extension = "csv";
                } else if (format === "pdf") {
                    buffer = await generatePDFReport(data, reportType, { start: startDate, end: endDate });
                    contentType = "application/pdf";
                    extension = "pdf";
                }

                // Upload to S3
                const timestamp = Date.now();
                const filename = `report_${timestamp}.${extension}`;
                const reportUrl = await uploadToS3(buffer, filename, contentType);

                response = {
                    success: true,
                    reportUrl,
                    filename,
                    format,
                    message: `${reportType} generated successfully in ${format.toUpperCase()} format.\n\nDownload your report here:\n${reportUrl}\n\nFilename: ${filename}\n\nNote: This download link expires in 7 days.`,
                };
                break;
            }

            case "/get-report-preview": {
                const { userId, reportType, startDate, endDate, childId } = params;

                let start, end;

                if (reportType === "daily") {
                    start = end = startDate;
                } else if (reportType === "weekly") {
                    start = startDate;
                    end = endDate;
                } else if (reportType === "monthly") {
                    const now = new Date();
                    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
                    end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
                } else {
                    start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                    end = endDate || new Date().toISOString().split("T")[0];
                }

                const data = await fetchReportData(pool, start, end, { childId });

                // Calculate event types
                const eventsByType = {};
                data.events.forEach(event => {
                    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
                });

                response = {
                    success: true,
                    summary: {
                        totalEvents: data.events.length,
                        totalBookings: data.bookings.length,
                        totalChildren: data.children.length,
                        eventsByType,
                    },
                    dateRange: {
                        start,
                        end,
                    },
                };
                break;
            }

            default:
                response = {
                    success: false,
                    error: `Unknown action: ${apiPath}`,
                };
        }

        return {
            messageVersion: "1.0",
            response: {
                actionGroup,
                apiPath,
                httpMethod: "POST",
                httpStatusCode: 200,
                responseBody: {
                    "application/json": {
                        body: JSON.stringify(response),
                    },
                },
            },
        };

    } catch (error) {
        console.error("Error:", error);

        return {
            messageVersion: "1.0",
            response: {
                actionGroup: event.actionGroup,
                apiPath: event.apiPath,
                httpMethod: "POST",
                httpStatusCode: 500,
                responseBody: {
                    "application/json": {
                        body: JSON.stringify({
                            success: false,
                            error: error.message,
                        }),
                    },
                },
            },
        };
    }
};
