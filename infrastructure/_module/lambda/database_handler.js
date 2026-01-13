const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { Pool } = require("pg");
const { createId } = require("@paralleldrive/cuid2");

// Cache the database connection and credentials
let dbPool = null;
let dbCredentials = null;

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
      rejectUnauthorized: false // Required for AWS RDS
    },
    max: 5, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return dbPool;
}

// Helper function to resolve user - tries ID first, then falls back to email lookup
async function resolveUser(pool, userId, userEmail) {
  // First try to find by ID
  if (userId) {
    const userById = await pool.query('SELECT id, name, email FROM "User" WHERE id = $1', [userId]);
    if (userById.rows.length > 0) {
      return userById.rows[0];
    }
    console.warn(`User with ID "${userId}" not found, trying email lookup...`);
  }

  // Fallback: try to find by email
  if (userEmail) {
    const userByEmail = await pool.query('SELECT id, name, email FROM "User" WHERE email = $1', [userEmail]);
    if (userByEmail.rows.length > 0) {
      console.log(`Found user by email: ${userByEmail.rows[0].id}`);
      return userByEmail.rows[0];
    }
  }

  // List available users for debugging
  const allUsers = await pool.query('SELECT id, email FROM "User" LIMIT 5');
  console.log('Available users in database:', JSON.stringify(allUsers.rows));

  return null;
}

// Handler for getting users
async function getUsers(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      id, name, email, "createdAt", "updatedAt"
    FROM "User"
    WHERE 1=1
  `;

  const queryParams = [];

  if (parameters.email) {
    queryParams.push(parameters.email);
    query += ` AND email = $${queryParams.length}`;
  }

  if (parameters.name) {
    queryParams.push(`%${parameters.name}%`);
    query += ` AND name ILIKE $${queryParams.length}`;
  }

  query += ' ORDER BY name';

  const result = await pool.query(query, queryParams);

  return {
    users: result.rows,
    count: result.rows.length
  };
}

// Handler for getting children
async function getChildren(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      id, "firstName", "lastName", "dateOfBirth",
      gender, allergies, "medicalInfo", notes,
      "userId", "createdAt", "updatedAt"
    FROM "child-details"
    WHERE 1=1
  `;

  const queryParams = [];

  if (parameters.userId) {
    queryParams.push(parameters.userId);
    query += ` AND "userId" = $${queryParams.length}`;
  }

  if (parameters.firstName) {
    queryParams.push(`%${parameters.firstName}%`);
    query += ` AND "firstName" ILIKE $${queryParams.length}`;
  }

  query += ' ORDER BY "firstName", "lastName"';

  const result = await pool.query(query, queryParams);

  return {
    children: result.rows,
    count: result.rows.length
  };
}

// Handler for getting child details with events
async function getChildDetails(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId) {
    throw new Error("childId is required");
  }

  // Get child details
  const childQuery = `
    SELECT
      id, "firstName", "lastName", "dateOfBirth",
      gender, allergies, "medicalInfo", notes,
      "userId", "createdAt", "updatedAt"
    FROM "child-details"
    WHERE id = $1
  `;

  const childResult = await pool.query(childQuery, [parameters.childId]);

  if (childResult.rows.length === 0) {
    return {
      error: "Child not found",
      childId: parameters.childId
    };
  }

  // Get child events
  const eventsQuery = `
    SELECT
      id, name, "eventType", "childId",
      "createdAt", "updatedAt"
    FROM "child-events"
    WHERE "childId" = $1
    ORDER BY "createdAt" DESC
  `;

  const eventsResult = await pool.query(eventsQuery, [parameters.childId]);

  const child = childResult.rows[0];
  child.events = eventsResult.rows;
  child.eventCount = eventsResult.rows.length;

  // Calculate age
  const birthDate = new Date(child.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  child.age = age;

  return { child };
}

// Handler for creating a new child
async function createChild(parameters) {
  const pool = await getDbPool();

  if (!parameters.firstName || !parameters.dateOfBirth) {
    throw new Error("firstName and dateOfBirth are required");
  }

  if (!parameters.userId && !parameters.userEmail) {
    throw new Error("userId or userEmail is required");
  }

  // Resolve user - try ID first, then fall back to email
  const user = await resolveUser(pool, parameters.userId, parameters.userEmail);
  if (!user) {
    throw new Error(`User not found. Tried ID: "${parameters.userId}", Email: "${parameters.userEmail}". Please sign out and sign back in to refresh your session.`);
  }

  // Use the resolved user's actual ID for the database operation
  const resolvedUserId = user.id;

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "create-child",
      message: `⚠️ CONFIRMATION REQUIRED: Create child "${parameters.firstName}${parameters.lastName ? ' ' + parameters.lastName : ''}" (DOB: ${parameters.dateOfBirth}) for user "${user.name || user.email}"? Please ask the user to confirm before proceeding.`,
      preview: {
        firstName: parameters.firstName,
        lastName: parameters.lastName || null,
        dateOfBirth: parameters.dateOfBirth,
        gender: parameters.gender || null,
        userId: resolvedUserId,
        userName: user.name || user.email
      }
    };
  }

  const childId = createId();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO "child-details" (
      id, "firstName", "lastName", "dateOfBirth",
      gender, allergies, "medicalInfo", notes,
      "userId", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    childId,
    parameters.firstName,
    parameters.lastName || null,
    parameters.dateOfBirth,
    parameters.gender || null,
    parameters.allergies || null,
    parameters.medicalInfo || null,
    parameters.notes || null,
    resolvedUserId,
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    child: result.rows[0],
    message: `Child ${parameters.firstName} created successfully`
  };
}

// Handler for updating a child
async function updateChild(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId) {
    throw new Error("childId is required");
  }

  // Fetch the current child data for preview
  const currentChildResult = await pool.query('SELECT * FROM "child-details" WHERE id = $1', [parameters.childId]);
  if (currentChildResult.rows.length === 0) {
    throw new Error("Child not found");
  }
  const currentChild = currentChildResult.rows[0];

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;
  const changes = {};

  if (parameters.firstName !== undefined) {
    updates.push(`"firstName" = $${paramIndex++}`);
    values.push(parameters.firstName);
    changes.firstName = { from: currentChild.firstName, to: parameters.firstName };
  }
  if (parameters.lastName !== undefined) {
    updates.push(`"lastName" = $${paramIndex++}`);
    values.push(parameters.lastName);
    changes.lastName = { from: currentChild.lastName, to: parameters.lastName };
  }
  if (parameters.dateOfBirth !== undefined) {
    updates.push(`"dateOfBirth" = $${paramIndex++}`);
    values.push(parameters.dateOfBirth);
    changes.dateOfBirth = { from: currentChild.dateOfBirth, to: parameters.dateOfBirth };
  }
  if (parameters.gender !== undefined) {
    updates.push(`gender = $${paramIndex++}`);
    values.push(parameters.gender);
    changes.gender = { from: currentChild.gender, to: parameters.gender };
  }
  if (parameters.allergies !== undefined) {
    updates.push(`allergies = $${paramIndex++}`);
    values.push(parameters.allergies);
    changes.allergies = { from: currentChild.allergies, to: parameters.allergies };
  }
  if (parameters.medicalInfo !== undefined) {
    updates.push(`"medicalInfo" = $${paramIndex++}`);
    values.push(parameters.medicalInfo);
    changes.medicalInfo = { from: currentChild.medicalInfo, to: parameters.medicalInfo };
  }
  if (parameters.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(parameters.notes);
    changes.notes = { from: currentChild.notes, to: parameters.notes };
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "update-child",
      message: `⚠️ CONFIRMATION REQUIRED: Update child "${currentChild.firstName} ${currentChild.lastName || ''}"? Changes: ${Object.keys(changes).map(k => `${k}: "${changes[k].from}" → "${changes[k].to}"`).join(", ")}. Please ask the user to confirm before proceeding.`,
      preview: {
        childId: parameters.childId,
        currentData: currentChild,
        changes: changes
      }
    };
  }

  updates.push(`"updatedAt" = $${paramIndex++}`);
  values.push(new Date().toISOString());

  values.push(parameters.childId);

  const query = `
    UPDATE "child-details"
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error("Child not found");
  }

  return {
    child: result.rows[0],
    message: "Child updated successfully"
  };
}

// Handler for deleting a child
async function deleteChild(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId) {
    throw new Error("childId is required");
  }

  // Fetch the child data and associated events for preview
  const childResult = await pool.query('SELECT * FROM "child-details" WHERE id = $1', [parameters.childId]);
  if (childResult.rows.length === 0) {
    throw new Error("Child not found");
  }
  const child = childResult.rows[0];

  const eventsResult = await pool.query('SELECT COUNT(*) as count FROM "child-events" WHERE "childId" = $1', [parameters.childId]);
  const eventCount = parseInt(eventsResult.rows[0].count, 10);

  const bookingsResult = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE "childId" = $1', [parameters.childId]);
  const bookingCount = parseInt(bookingsResult.rows[0].count, 10);

  // Always require confirmation for DB-modifying actions (especially delete!)
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    const warnings = [];
    if (eventCount > 0) warnings.push(`${eventCount} event(s)`);
    if (bookingCount > 0) warnings.push(`${bookingCount} booking(s)`);
    const warningMsg = warnings.length > 0
      ? `⚠️ WARNING: This will also DELETE ${warnings.join(' and ')}!`
      : "";
    return {
      requiresConfirmation: true,
      action: "delete-child",
      message: `🚨 CONFIRMATION REQUIRED: Delete child "${child.firstName} ${child.lastName || ''}" permanently? ${warningMsg} Please ask the user to confirm before proceeding.`,
      preview: {
        childId: parameters.childId,
        child: { firstName: child.firstName, lastName: child.lastName, dateOfBirth: child.dateOfBirth },
        eventCount: eventCount,
        bookingCount: bookingCount
      },
      warning: warningMsg || null
    };
  }

  // First, delete all associated events and bookings
  await pool.query('DELETE FROM "child-events" WHERE "childId" = $1', [parameters.childId]);
  await pool.query('DELETE FROM bookings WHERE "childId" = $1', [parameters.childId]);

  // Then delete the child
  const deleteResult = await pool.query('DELETE FROM "child-details" WHERE id = $1 RETURNING "firstName", "lastName"', [parameters.childId]);

  if (deleteResult.rows.length === 0) {
    throw new Error("Child not found");
  }

  const deletedChild = deleteResult.rows[0];
  return {
    message: `Child ${deletedChild.firstName} ${deletedChild.lastName || ''} and all associated data deleted successfully`,
    deletedChildId: parameters.childId
  };
}

// Handler for creating a new event
async function createEvent(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId || !parameters.name || !parameters.eventType) {
    throw new Error("childId, name, and eventType are required");
  }

  // Verify child exists and get child name for preview
  const childCheck = await pool.query('SELECT id, "firstName", "lastName" FROM "child-details" WHERE id = $1', [parameters.childId]);
  if (childCheck.rows.length === 0) {
    throw new Error("Child not found");
  }
  const child = childCheck.rows[0];

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "create-event",
      message: `⚠️ CONFIRMATION REQUIRED: Log event "${parameters.name}" (type: ${parameters.eventType}) for child "${child.firstName} ${child.lastName || ''}"? Please ask the user to confirm before proceeding.`,
      preview: {
        name: parameters.name,
        eventType: parameters.eventType,
        childId: parameters.childId,
        childName: `${child.firstName} ${child.lastName || ''}`.trim()
      }
    };
  }

  const eventId = createId();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO "child-events" (
      id, name, "eventType", "childId",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    eventId,
    parameters.name,
    parameters.eventType,
    parameters.childId,
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    event: result.rows[0],
    message: `Event "${parameters.name}" created successfully`
  };
}

// Handler for deleting an event
async function deleteEvent(parameters) {
  const pool = await getDbPool();

  if (!parameters.eventId) {
    throw new Error("eventId is required");
  }

  // Fetch the event data for preview
  const eventResult = await pool.query('SELECT * FROM "child-events" WHERE id = $1', [parameters.eventId]);
  if (eventResult.rows.length === 0) {
    throw new Error("Event not found");
  }
  const eventData = eventResult.rows[0];

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "delete-event",
      message: `⚠️ CONFIRMATION REQUIRED: Delete event "${eventData.name}" (type: ${eventData.eventType}) permanently? Please ask the user to confirm before proceeding.`,
      preview: {
        eventId: parameters.eventId,
        event: { name: eventData.name, eventType: eventData.eventType }
      }
    };
  }

  const deleteResult = await pool.query('DELETE FROM "child-events" WHERE id = $1 RETURNING name', [parameters.eventId]);

  if (deleteResult.rows.length === 0) {
    throw new Error("Event not found");
  }

  const deletedEvent = deleteResult.rows[0];
  return {
    message: `Event "${deletedEvent.name}" deleted successfully`,
    deletedEventId: parameters.eventId
  };
}

// ===============================
// BOOKING HANDLERS
// ===============================

// Handler for getting bookings (supports filtering and calendar view)
async function getBookings(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      b.id, b.name, b.date, b.time, b.notes,
      b."userId", b."childId", b."createdAt", b."updatedAt",
      u.name as "userName", u.email as "userEmail",
      c."firstName" as "childFirstName", c."lastName" as "childLastName"
    FROM bookings b
    LEFT JOIN "User" u ON b."userId" = u.id
    LEFT JOIN "child-details" c ON b."childId" = c.id
    WHERE 1=1
  `;

  const queryParams = [];

  // If bookingId is provided, get a single booking
  if (parameters.bookingId) {
    queryParams.push(parameters.bookingId);
    query += ` AND b.id = $${queryParams.length}`;
  }

  if (parameters.userId) {
    queryParams.push(parameters.userId);
    query += ` AND b."userId" = $${queryParams.length}`;
  }

  if (parameters.childId) {
    queryParams.push(parameters.childId);
    query += ` AND b."childId" = $${queryParams.length}`;
  }

  if (parameters.date) {
    queryParams.push(parameters.date);
    query += ` AND DATE(b.date) = $${queryParams.length}`;
  }

  if (parameters.fromDate) {
    queryParams.push(parameters.fromDate);
    query += ` AND b.date >= $${queryParams.length}`;
  }

  if (parameters.toDate) {
    queryParams.push(parameters.toDate);
    query += ` AND b.date <= $${queryParams.length}`;
  }

  query += ' ORDER BY b.date ASC, b.time ASC';

  const result = await pool.query(query, queryParams);

  const bookings = result.rows.map(row => ({
    ...row,
    childName: row.childFirstName ? `${row.childFirstName} ${row.childLastName || ''}`.trim() : null
  }));

  // If a specific booking was requested and found, return it directly
  if (parameters.bookingId && result.rows.length > 0) {
    return { booking: bookings[0] };
  }

  // If date range provided, also group by date for calendar view
  if (parameters.fromDate && parameters.toDate) {
    const bookingsByDate = {};
    for (const booking of bookings) {
      const dateKey = new Date(booking.date).toISOString().split('T')[0];
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
    }
    return {
      bookings,
      bookingsByDate,
      count: bookings.length,
      dateRange: { start: parameters.fromDate, end: parameters.toDate }
    };
  }

  return {
    bookings,
    count: bookings.length
  };
}

// Handler for creating a new booking
async function createBooking(parameters) {
  const pool = await getDbPool();

  if (!parameters.name || !parameters.date || !parameters.time) {
    throw new Error("name, date, and time are required");
  }

  if (!parameters.userId && !parameters.userEmail) {
    throw new Error("userId or userEmail is required");
  }

  // Resolve user - try ID first, then fall back to email
  const user = await resolveUser(pool, parameters.userId, parameters.userEmail);
  if (!user) {
    throw new Error(`User not found. Tried ID: "${parameters.userId}", Email: "${parameters.userEmail}". Please sign out and sign back in to refresh your session.`);
  }

  // Use the resolved user's actual ID for the database operation
  const resolvedUserId = user.id;

  // If childId provided, verify child exists
  let child = null;
  if (parameters.childId) {
    const childCheck = await pool.query('SELECT id, "firstName", "lastName" FROM "child-details" WHERE id = $1', [parameters.childId]);
    if (childCheck.rows.length === 0) {
      throw new Error(`Child with ID "${parameters.childId}" not found.`);
    }
    child = childCheck.rows[0];
  }

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    const childInfo = child ? ` for child "${child.firstName} ${child.lastName || ''}"` : "";
    return {
      requiresConfirmation: true,
      action: "create-booking",
      message: `⚠️ CONFIRMATION REQUIRED: Create booking "${parameters.name}" on ${parameters.date} at ${parameters.time}${childInfo} for user "${user.name || user.email}"? Please ask the user to confirm before proceeding.`,
      preview: {
        name: parameters.name,
        date: parameters.date,
        time: parameters.time,
        notes: parameters.notes || null,
        userId: resolvedUserId,
        userName: user.name || user.email,
        childId: parameters.childId || null,
        childName: child ? `${child.firstName} ${child.lastName || ''}`.trim() : null
      }
    };
  }

  const bookingId = createId();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO bookings (
      id, name, date, time, notes,
      "userId", "childId", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    bookingId,
    parameters.name,
    parameters.date,
    parameters.time,
    parameters.notes || null,
    resolvedUserId,
    parameters.childId || null,
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    booking: result.rows[0],
    message: `Booking "${parameters.name}" on ${parameters.date} at ${parameters.time} created successfully`
  };
}

// Handler for updating a booking
async function updateBooking(parameters) {
  const pool = await getDbPool();

  if (!parameters.bookingId) {
    throw new Error("bookingId is required");
  }

  // Fetch the current booking data for preview
  const currentBookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parameters.bookingId]);
  if (currentBookingResult.rows.length === 0) {
    throw new Error("Booking not found");
  }
  const currentBooking = currentBookingResult.rows[0];

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;
  const changes = {};

  if (parameters.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(parameters.name);
    changes.name = { from: currentBooking.name, to: parameters.name };
  }
  if (parameters.date !== undefined) {
    updates.push(`date = $${paramIndex++}`);
    values.push(parameters.date);
    changes.date = { from: currentBooking.date, to: parameters.date };
  }
  if (parameters.time !== undefined) {
    updates.push(`time = $${paramIndex++}`);
    values.push(parameters.time);
    changes.time = { from: currentBooking.time, to: parameters.time };
  }
  if (parameters.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(parameters.notes);
    changes.notes = { from: currentBooking.notes, to: parameters.notes };
  }
  if (parameters.childId !== undefined) {
    updates.push(`"childId" = $${paramIndex++}`);
    values.push(parameters.childId || null);
    changes.childId = { from: currentBooking.childId, to: parameters.childId };
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "update-booking",
      message: `⚠️ CONFIRMATION REQUIRED: Update booking "${currentBooking.name}"? Changes: ${Object.keys(changes).map(k => `${k}: "${changes[k].from}" → "${changes[k].to}"`).join(", ")}. Please ask the user to confirm before proceeding.`,
      preview: {
        bookingId: parameters.bookingId,
        currentData: currentBooking,
        changes: changes
      }
    };
  }

  updates.push(`"updatedAt" = $${paramIndex++}`);
  values.push(new Date().toISOString());

  values.push(parameters.bookingId);

  const query = `
    UPDATE bookings
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error("Booking not found");
  }

  return {
    booking: result.rows[0],
    message: "Booking updated successfully"
  };
}

// Handler for deleting a booking
async function deleteBooking(parameters) {
  const pool = await getDbPool();

  if (!parameters.bookingId) {
    throw new Error("bookingId is required");
  }

  // Fetch the booking data for preview
  const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parameters.bookingId]);
  if (bookingResult.rows.length === 0) {
    throw new Error("Booking not found");
  }
  const booking = bookingResult.rows[0];

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "delete-booking",
      message: `🚨 CONFIRMATION REQUIRED: Delete booking "${booking.name}" on ${booking.date} at ${booking.time} permanently? Please ask the user to confirm before proceeding.`,
      preview: {
        bookingId: parameters.bookingId,
        booking: {
          name: booking.name,
          date: booking.date,
          time: booking.time,
          notes: booking.notes
        }
      }
    };
  }

  const deleteResult = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING name, date, time', [parameters.bookingId]);

  if (deleteResult.rows.length === 0) {
    throw new Error("Booking not found");
  }

  const deletedBooking = deleteResult.rows[0];
  return {
    message: `Booking "${deletedBooking.name}" on ${deletedBooking.date} at ${deletedBooking.time} deleted successfully`,
    deletedBookingId: parameters.bookingId
  };
}

// Main Lambda handler
exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // Extract the action and parameters from the Bedrock Agent event
    const actionGroup = event.actionGroup;
    const apiPath = event.apiPath;
    const httpMethod = event.httpMethod;

    // Parse parameters from Bedrock Agent event
    let parameters = {};

    // Method 1: Parameters come as an array of {name, value} objects
    if (event.parameters && Array.isArray(event.parameters)) {
      for (const param of event.parameters) {
        parameters[param.name] = param.value;
      }
    }

    // Method 2: Parameters in requestBody
    if (event.requestBody?.content?.["application/json"]) {
      const bodyContent = event.requestBody.content["application/json"];
      // Body can be a string to parse, or properties array
      if (bodyContent.body && typeof bodyContent.body === "string") {
        try {
          const parsed = JSON.parse(bodyContent.body);
          parameters = { ...parameters, ...parsed };
        } catch (e) {
          console.warn("Failed to parse request body:", e.message);
        }
      } else if (bodyContent.properties && Array.isArray(bodyContent.properties)) {
        for (const prop of bodyContent.properties) {
          parameters[prop.name] = prop.value;
        }
      }
    }

    console.log("Action:", apiPath, "Parameters:", parameters);

    let result;

    // Route to appropriate handler based on API path
    switch (apiPath) {
      // User and child management
      case "/get-users":
        result = await getUsers(parameters);
        break;
      case "/get-children":
        result = await getChildren(parameters);
        break;
      case "/get-child-details":
        result = await getChildDetails(parameters);
        break;
      case "/create-child":
        result = await createChild(parameters);
        break;
      case "/update-child":
        result = await updateChild(parameters);
        break;
      case "/delete-child":
        result = await deleteChild(parameters);
        break;
      // Event management
      case "/create-event":
        result = await createEvent(parameters);
        break;
      case "/delete-event":
        result = await deleteEvent(parameters);
        break;
      // Booking management
      case "/get-bookings":
        result = await getBookings(parameters);
        break;
      case "/create-booking":
        result = await createBooking(parameters);
        break;
      case "/update-booking":
        result = await updateBooking(parameters);
        break;
      case "/delete-booking":
        result = await deleteBooking(parameters);
        break;
      default:
        throw new Error(`Unknown API path: ${apiPath}`);
    }

    // Return response in Bedrock Agent format
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: actionGroup,
        apiPath: apiPath,
        httpMethod: httpMethod,
        httpStatusCode: 200,
        responseBody: {
          "application/json": {
            body: JSON.stringify(result)
          }
        }
      }
    };

  } catch (error) {
    console.error("Error:", error);

    return {
      messageVersion: "1.0",
      response: {
        actionGroup: event.actionGroup,
        apiPath: event.apiPath,
        httpMethod: event.httpMethod,
        httpStatusCode: 500,
        responseBody: {
          "application/json": {
            body: JSON.stringify({
              error: error.message,
              type: error.name
            })
          }
        }
      }
    };
  }
};
