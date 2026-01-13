import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { format } from "date-fns"
import type { ReportData } from "@/app/actions/reports"

// Brand colors converted to hex
const colors = {
    primary: "#c2410c", // Hull Orange 900
    secondary: "#0e7490", // Nebula Cyan 700
    tertiary: "#a855f7", // Luna Purple 500
    gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        500: "#6b7280",
        700: "#374151",
        900: "#111827",
    },
}

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff",
    },
    header: {
        marginBottom: 30,
        borderBottom: `2px solid ${colors.primary}`,
        paddingBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.primary,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: colors.gray[500],
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    metaText: {
        fontSize: 9,
        color: colors.gray[500],
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.secondary,
        marginBottom: 10,
        paddingBottom: 5,
        borderBottom: `1px solid ${colors.gray[200]}`,
    },
    summaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    summaryCard: {
        backgroundColor: colors.gray[50],
        padding: 12,
        borderRadius: 6,
        width: "30%",
        borderLeft: `3px solid ${colors.primary}`,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.gray[900],
    },
    summaryLabel: {
        fontSize: 9,
        color: colors.gray[500],
        marginTop: 2,
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: colors.gray[100],
        padding: 8,
        borderRadius: 4,
        marginBottom: 5,
    },
    tableHeaderCell: {
        fontSize: 9,
        fontWeight: "bold",
        color: colors.gray[700],
    },
    tableRow: {
        flexDirection: "row",
        padding: 8,
        borderBottom: `1px solid ${colors.gray[100]}`,
    },
    tableRowAlt: {
        flexDirection: "row",
        padding: 8,
        borderBottom: `1px solid ${colors.gray[100]}`,
        backgroundColor: colors.gray[50],
    },
    tableCell: {
        fontSize: 9,
        color: colors.gray[700],
    },
    eventTypeTag: {
        backgroundColor: colors.tertiary,
        color: "#ffffff",
        padding: "2 6",
        borderRadius: 3,
        fontSize: 8,
    },
    noData: {
        padding: 20,
        textAlign: "center",
        color: colors.gray[500],
        fontStyle: "italic",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        borderTop: `1px solid ${colors.gray[200]}`,
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: colors.gray[500],
    },
    pageNumber: {
        fontSize: 8,
        color: colors.gray[500],
    },
    eventsByTypeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
    },
    eventTypeCard: {
        backgroundColor: colors.gray[50],
        padding: 8,
        borderRadius: 4,
        minWidth: 80,
        borderLeft: `3px solid ${colors.tertiary}`,
    },
    eventTypeValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.gray[900],
    },
    eventTypeLabel: {
        fontSize: 8,
        color: colors.gray[500],
        textTransform: "capitalize",
    },
})

function formatDate(date: Date | string): string {
    return format(new Date(date), "MMM d, yyyy")
}

function formatDateTime(date: Date | string): string {
    return format(new Date(date), "MMM d, yyyy h:mm a")
}

interface ReportPDFProps {
    data: ReportData
}

export function ReportPDF({ data }: ReportPDFProps) {
    const reportTypeLabels = {
        daily: "Daily Report",
        weekly: "Weekly Report",
        monthly: "Monthly Report",
        custom: "Custom Report",
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Child Event Assistant</Text>
                    <Text style={styles.subtitle}>{reportTypeLabels[data.reportType]}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                            Period: {formatDate(data.dateRange.start)} - {formatDate(data.dateRange.end)}
                        </Text>
                        <Text style={styles.metaText}>
                            Generated: {formatDateTime(data.generatedAt)}
                        </Text>
                    </View>
                    <Text style={[styles.metaText, { marginTop: 5 }]}>
                        User: {data.user.name || data.user.email}
                    </Text>
                </View>

                {/* Summary Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{data.summary.totalChildren}</Text>
                            <Text style={styles.summaryLabel}>Children</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{data.summary.totalEvents}</Text>
                            <Text style={styles.summaryLabel}>Events</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{data.summary.totalBookings}</Text>
                            <Text style={styles.summaryLabel}>Bookings</Text>
                        </View>
                    </View>

                    {/* Events by Type */}
                    {Object.keys(data.summary.eventsByType).length > 0 && (
                        <View>
                            <Text style={[styles.metaText, { marginBottom: 5 }]}>Events by Type:</Text>
                            <View style={styles.eventsByTypeGrid}>
                                {Object.entries(data.summary.eventsByType).map(([type, count]) => (
                                    <View key={type} style={styles.eventTypeCard}>
                                        <Text style={styles.eventTypeValue}>{count}</Text>
                                        <Text style={styles.eventTypeLabel}>{type}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* Children Section */}
                {data.children.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Children Overview</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Name</Text>
                                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Age</Text>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Events</Text>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Bookings</Text>
                            </View>
                            {data.children.map((child, index) => {
                                const age = Math.floor(
                                    (new Date().getTime() - new Date(child.dateOfBirth).getTime()) /
                                    (365.25 * 24 * 60 * 60 * 1000)
                                )
                                return (
                                    <View
                                        key={child.id}
                                        style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                                    >
                                        <Text style={[styles.tableCell, { width: "30%" }]}>
                                            {child.firstName} {child.lastName || ""}
                                        </Text>
                                        <Text style={[styles.tableCell, { width: "20%" }]}>
                                            {age} years
                                        </Text>
                                        <Text style={[styles.tableCell, { width: "25%" }]}>
                                            {child.eventCount}
                                        </Text>
                                        <Text style={[styles.tableCell, { width: "25%" }]}>
                                            {child.bookingCount}
                                        </Text>
                                    </View>
                                )
                            })}
                        </View>
                    </View>
                )}

                {/* Events Section */}
                {data.events.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Events ({data.events.length})</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Date</Text>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Child</Text>
                                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Type</Text>
                                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Event</Text>
                            </View>
                            {data.events.slice(0, 20).map((event, index) => (
                                <View
                                    key={event.id}
                                    style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                                >
                                    <Text style={[styles.tableCell, { width: "25%" }]}>
                                        {formatDateTime(event.createdAt)}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "25%" }]}>
                                        {event.child.firstName} {event.child.lastName || ""}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "20%" }]}>
                                        {event.eventType}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "30%" }]}>
                                        {event.name}
                                    </Text>
                                </View>
                            ))}
                            {data.events.length > 20 && (
                                <Text style={[styles.metaText, { marginTop: 10 }]}>
                                    ... and {data.events.length - 20} more events
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Bookings Section */}
                {data.bookings.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Bookings ({data.bookings.length})</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Date</Text>
                                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Time</Text>
                                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Booking</Text>
                                <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Child</Text>
                            </View>
                            {data.bookings.slice(0, 20).map((booking, index) => (
                                <View
                                    key={booking.id}
                                    style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                                >
                                    <Text style={[styles.tableCell, { width: "25%" }]}>
                                        {formatDate(booking.date)}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "15%" }]}>
                                        {booking.time}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "25%" }]}>
                                        {booking.name}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: "35%" }]}>
                                        {booking.child
                                            ? `${booking.child.firstName} ${booking.child.lastName || ""}`
                                            : "N/A"}
                                    </Text>
                                </View>
                            ))}
                            {data.bookings.length > 20 && (
                                <Text style={[styles.metaText, { marginTop: 10 }]}>
                                    ... and {data.bookings.length - 20} more bookings
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* No Data Message */}
                {data.events.length === 0 && data.bookings.length === 0 && (
                    <View style={styles.section}>
                        <Text style={styles.noData}>
                            No events or bookings found for the selected period.
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Child Event Assistant - Confidential Report
                    </Text>
                    <Text
                        style={styles.pageNumber}
                        render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} of ${totalPages}`
                        }
                    />
                </View>
            </Page>
        </Document>
    )
}
