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

// ========== MEAL MANAGEMENT HANDLERS ==========

// Handler for getting meals
async function getMeals(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      id, "userId", name, description, ingredients,
      category, "isTemplate", "allergyInfo", "prepTime",
      "createdAt", "updatedAt"
    FROM meals
    WHERE 1=1
  `;

  const queryParams = [];

  // If specific meal requested by ID
  if (parameters.mealId) {
    queryParams.push(parameters.mealId);
    query += ` AND id = $${queryParams.length}`;
  }

  if (parameters.userId) {
    queryParams.push(parameters.userId);
    query += ` AND "userId" = $${queryParams.length}`;
  }

  if (parameters.category) {
    queryParams.push(parameters.category);
    query += ` AND category = $${queryParams.length}`;
  }

  if (parameters.isTemplate !== undefined) {
    queryParams.push(parameters.isTemplate);
    query += ` AND "isTemplate" = $${queryParams.length}`;
  }

  query += ' ORDER BY name';

  const result = await pool.query(query, queryParams);
  const meals = result.rows;

  // If specific meal requested, return single meal object
  if (parameters.mealId && result.rows.length > 0) {
    return { meal: meals[0] };
  }

  return {
    meals,
    count: meals.length
  };
}

// Handler for creating a new meal
async function createMeal(parameters) {
  const pool = await getDbPool();

  if (!parameters.name || !parameters.category) {
    throw new Error("name and category are required");
  }

  if (!parameters.userId && !parameters.userEmail) {
    throw new Error("userId or userEmail is required");
  }

  // Validate category
  const validCategories = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validCategories.includes(parameters.category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
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
      action: "create-meal",
      message: `⚠️ CONFIRMATION REQUIRED: Create meal "${parameters.name}" (${parameters.category}) for user "${user.name || user.email}"? Please ask the user to confirm before proceeding.`,
      preview: {
        name: parameters.name,
        description: parameters.description || null,
        category: parameters.category,
        ingredients: parameters.ingredients || null,
        isTemplate: parameters.isTemplate || false,
        allergyInfo: parameters.allergyInfo || null,
        prepTime: parameters.prepTime || null,
        userId: resolvedUserId,
        userName: user.name || user.email
      }
    };
  }

  const mealId = createId();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO meals (
      id, "userId", name, description, ingredients,
      category, "isTemplate", "allergyInfo", "prepTime",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    mealId,
    resolvedUserId,
    parameters.name,
    parameters.description || null,
    parameters.ingredients || null,
    parameters.category,
    parameters.isTemplate || false,
    parameters.allergyInfo || null,
    parameters.prepTime || null,
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    meal: result.rows[0],
    message: `Meal "${parameters.name}" created successfully`
  };
}

// Handler for updating a meal
async function updateMeal(parameters) {
  const pool = await getDbPool();

  if (!parameters.mealId) {
    throw new Error("mealId is required");
  }

  // Fetch the current meal data for preview
  const currentMealResult = await pool.query('SELECT * FROM meals WHERE id = $1', [parameters.mealId]);
  if (currentMealResult.rows.length === 0) {
    throw new Error("Meal not found");
  }
  const currentMeal = currentMealResult.rows[0];

  // Validate category if provided
  if (parameters.category) {
    const validCategories = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validCategories.includes(parameters.category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;
  const changes = {};

  if (parameters.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(parameters.name);
    changes.name = { from: currentMeal.name, to: parameters.name };
  }
  if (parameters.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(parameters.description);
    changes.description = { from: currentMeal.description, to: parameters.description };
  }
  if (parameters.ingredients !== undefined) {
    updates.push(`ingredients = $${paramIndex++}`);
    values.push(parameters.ingredients);
    changes.ingredients = { from: currentMeal.ingredients, to: parameters.ingredients };
  }
  if (parameters.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(parameters.category);
    changes.category = { from: currentMeal.category, to: parameters.category };
  }
  if (parameters.isTemplate !== undefined) {
    updates.push(`"isTemplate" = $${paramIndex++}`);
    values.push(parameters.isTemplate);
    changes.isTemplate = { from: currentMeal.isTemplate, to: parameters.isTemplate };
  }
  if (parameters.allergyInfo !== undefined) {
    updates.push(`"allergyInfo" = $${paramIndex++}`);
    values.push(parameters.allergyInfo);
    changes.allergyInfo = { from: currentMeal.allergyInfo, to: parameters.allergyInfo };
  }
  if (parameters.prepTime !== undefined) {
    updates.push(`"prepTime" = $${paramIndex++}`);
    values.push(parameters.prepTime);
    changes.prepTime = { from: currentMeal.prepTime, to: parameters.prepTime };
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "update-meal",
      message: `⚠️ CONFIRMATION REQUIRED: Update meal "${currentMeal.name}"? Changes: ${Object.keys(changes).map(k => `${k}: "${changes[k].from}" → "${changes[k].to}"`).join(", ")}. Please ask the user to confirm before proceeding.`,
      preview: {
        mealId: parameters.mealId,
        currentData: currentMeal,
        changes: changes
      }
    };
  }

  updates.push(`"updatedAt" = $${paramIndex++}`);
  values.push(new Date().toISOString());

  values.push(parameters.mealId);

  const query = `
    UPDATE meals
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error("Meal not found");
  }

  return {
    meal: result.rows[0],
    message: "Meal updated successfully"
  };
}

// Handler for deleting a meal
async function deleteMeal(parameters) {
  const pool = await getDbPool();

  if (!parameters.mealId) {
    throw new Error("mealId is required");
  }

  // Fetch the meal data for preview
  const mealResult = await pool.query('SELECT * FROM meals WHERE id = $1', [parameters.mealId]);
  if (mealResult.rows.length === 0) {
    throw new Error("Meal not found");
  }
  const meal = mealResult.rows[0];

  // Check if meal is used in any meal plans
  const usageResult = await pool.query(
    'SELECT COUNT(*) as count FROM "meal-plan-entries" WHERE "mealId" = $1',
    [parameters.mealId]
  );
  const usageCount = parseInt(usageResult.rows[0].count, 10);

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    const warnings = [];
    if (usageCount > 0) {
      warnings.push(`⚠️ This meal is used in ${usageCount} meal plan entries. Deleting it may affect existing meal plans.`);
    }

    return {
      requiresConfirmation: true,
      action: "delete-meal",
      message: `🚨 CONFIRMATION REQUIRED: Delete meal "${meal.name}" (${meal.category}) permanently? ${warnings.join(' ')} Please ask the user to confirm before proceeding.`,
      preview: {
        mealId: parameters.mealId,
        meal: {
          name: meal.name,
          category: meal.category,
          description: meal.description
        },
        usageCount: usageCount
      }
    };
  }

  const deleteResult = await pool.query(
    'DELETE FROM meals WHERE id = $1 RETURNING name, category',
    [parameters.mealId]
  );

  if (deleteResult.rows.length === 0) {
    throw new Error("Meal not found");
  }

  const deletedMeal = deleteResult.rows[0];
  return {
    message: `Meal "${deletedMeal.name}" (${deletedMeal.category}) deleted successfully`,
    deletedMealId: parameters.mealId
  };
}

// Handler for getting meal plans
async function getMealPlans(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      id, "userId", name, "startDate", "endDate",
      "isActive", "createdAt", "updatedAt"
    FROM "meal-plans"
    WHERE 1=1
  `;

  const queryParams = [];

  // If specific meal plan requested by ID
  if (parameters.mealPlanId) {
    queryParams.push(parameters.mealPlanId);
    query += ` AND id = $${queryParams.length}`;
  }

  if (parameters.userId) {
    queryParams.push(parameters.userId);
    query += ` AND "userId" = $${queryParams.length}`;
  }

  if (parameters.isActive !== undefined) {
    queryParams.push(parameters.isActive);
    query += ` AND "isActive" = $${queryParams.length}`;
  }

  query += ' ORDER BY "startDate" DESC';

  const result = await pool.query(query, queryParams);
  const mealPlans = result.rows;

  // If includeEntries is requested, fetch entries for each meal plan
  if (parameters.includeEntries) {
    for (const plan of mealPlans) {
      const entriesQuery = `
        SELECT
          mpe.id, mpe."mealPlanId", mpe."mealId", mpe."dayOfWeek",
          mpe."mealTime", mpe.notes, mpe."createdAt", mpe."updatedAt",
          m.name as "mealName", m.description as "mealDescription",
          m.category, m."prepTime", m."allergyInfo"
        FROM "meal-plan-entries" mpe
        JOIN meals m ON mpe."mealId" = m.id
        WHERE mpe."mealPlanId" = $1
        ORDER BY mpe."dayOfWeek", mpe."mealTime"
      `;
      const entriesResult = await pool.query(entriesQuery, [plan.id]);
      plan.entries = entriesResult.rows;
    }
  }

  // If specific meal plan requested, return single plan object
  if (parameters.mealPlanId && result.rows.length > 0) {
    return { mealPlan: mealPlans[0] };
  }

  return {
    mealPlans,
    count: mealPlans.length
  };
}

// Handler for creating a new meal plan
async function createMealPlan(parameters) {
  const pool = await getDbPool();

  if (!parameters.name || !parameters.startDate || !parameters.endDate) {
    throw new Error("name, startDate, and endDate are required");
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

  // Validate dates
  const startDate = new Date(parameters.startDate);
  const endDate = new Date(parameters.endDate);
  if (startDate > endDate) {
    throw new Error("startDate must be before endDate");
  }

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    return {
      requiresConfirmation: true,
      action: "create-meal-plan",
      message: `⚠️ CONFIRMATION REQUIRED: Create meal plan "${parameters.name}" from ${parameters.startDate} to ${parameters.endDate} for user "${user.name || user.email}"? Please ask the user to confirm before proceeding.`,
      preview: {
        name: parameters.name,
        startDate: parameters.startDate,
        endDate: parameters.endDate,
        isActive: parameters.isActive !== false,
        userId: resolvedUserId,
        userName: user.name || user.email
      }
    };
  }

  const mealPlanId = createId();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO "meal-plans" (
      id, "userId", name, "startDate", "endDate",
      "isActive", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    mealPlanId,
    resolvedUserId,
    parameters.name,
    parameters.startDate,
    parameters.endDate,
    parameters.isActive !== false, // Default to true
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    mealPlan: result.rows[0],
    message: `Meal plan "${parameters.name}" created successfully`
  };
}

// Handler for adding a meal to a meal plan
async function addMealToPlan(parameters) {
  const pool = await getDbPool();

  if (!parameters.mealPlanId || !parameters.mealId || parameters.dayOfWeek === undefined || !parameters.mealTime) {
    throw new Error("mealPlanId, mealId, dayOfWeek, and mealTime are required");
  }

  // Validate dayOfWeek (0-6)
  if (parameters.dayOfWeek < 0 || parameters.dayOfWeek > 6) {
    throw new Error("dayOfWeek must be between 0 (Monday) and 6 (Sunday)");
  }

  // Validate mealTime
  const validMealTimes = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validMealTimes.includes(parameters.mealTime)) {
    throw new Error(`Invalid mealTime. Must be one of: ${validMealTimes.join(', ')}`);
  }

  // Verify meal plan exists
  const mealPlanCheck = await pool.query(
    'SELECT id, name, "startDate", "endDate" FROM "meal-plans" WHERE id = $1',
    [parameters.mealPlanId]
  );
  if (mealPlanCheck.rows.length === 0) {
    throw new Error(`Meal plan with ID "${parameters.mealPlanId}" not found.`);
  }
  const mealPlan = mealPlanCheck.rows[0];

  // Verify meal exists
  const mealCheck = await pool.query(
    'SELECT id, name, category FROM meals WHERE id = $1',
    [parameters.mealId]
  );
  if (mealCheck.rows.length === 0) {
    throw new Error(`Meal with ID "${parameters.mealId}" not found.`);
  }
  const meal = mealCheck.rows[0];

  // Check if this slot already has a meal
  const existingEntry = await pool.query(
    'SELECT id, "mealId" FROM "meal-plan-entries" WHERE "mealPlanId" = $1 AND "dayOfWeek" = $2 AND "mealTime" = $3',
    [parameters.mealPlanId, parameters.dayOfWeek, parameters.mealTime]
  );

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayName = dayNames[parameters.dayOfWeek];

  // Always require confirmation for DB-modifying actions
  if (parameters.confirmed !== true && parameters.confirmed !== "true") {
    const warnings = existingEntry.rows.length > 0
      ? `⚠️ This will replace the existing ${parameters.mealTime} for ${dayName}.`
      : '';

    return {
      requiresConfirmation: true,
      action: "add-meal-to-plan",
      message: `⚠️ CONFIRMATION REQUIRED: Add "${meal.name}" as ${parameters.mealTime} on ${dayName} to meal plan "${mealPlan.name}"? ${warnings} Please ask the user to confirm before proceeding.`,
      preview: {
        mealPlanName: mealPlan.name,
        mealName: meal.name,
        mealCategory: meal.category,
        dayOfWeek: parameters.dayOfWeek,
        dayName: dayName,
        mealTime: parameters.mealTime,
        willReplace: existingEntry.rows.length > 0,
        notes: parameters.notes || null
      }
    };
  }

  const entryId = createId();
  const now = new Date().toISOString();

  // Use UPSERT to handle replacing existing entries
  const query = `
    INSERT INTO "meal-plan-entries" (
      id, "mealPlanId", "mealId", "dayOfWeek", "mealTime", notes, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT ("mealPlanId", "dayOfWeek", "mealTime")
    DO UPDATE SET
      "mealId" = EXCLUDED."mealId",
      notes = EXCLUDED.notes,
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING *
  `;

  const values = [
    entryId,
    parameters.mealPlanId,
    parameters.mealId,
    parameters.dayOfWeek,
    parameters.mealTime,
    parameters.notes || null,
    now,
    now
  ];

  const result = await pool.query(query, values);

  return {
    entry: result.rows[0],
    message: `Added "${meal.name}" as ${parameters.mealTime} on ${dayName} to meal plan "${mealPlan.name}"`
  };
}

// ============================================================================
// LOCATION DATA HANDLERS
// ============================================================================

// Browser-like headers to avoid bot detection when fetching property sites
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

// Map state codes to lowercase URL slugs
const STATE_MAP = {
  NSW: 'nsw', VIC: 'vic', QLD: 'qld', WA: 'wa',
  SA: 'sa', TAS: 'tas', NT: 'nt', ACT: 'act',
};

/**
 * Fetch with a timeout using AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse realestate.com.au suburb profile HTML for property data
 */
function parseRealestatePage(html) {
  const data = {};

  // 1. Try extracting from window.ArgonautExchange JSON blob
  const argonautMatch = html.match(/window\.ArgonautExchange\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (argonautMatch) {
    try {
      const argonaut = JSON.parse(argonautMatch[1]);
      console.log('Found ArgonautExchange data');
      // Walk the object looking for price data
      const jsonStr = JSON.stringify(argonaut);
      const medianHouseMatch = jsonStr.match(/"medianSoldPrice":\s*(\d+)/);
      const medianUnitMatch = jsonStr.match(/"medianSoldPrice":\s*\d+[^}]*"medianSoldPrice":\s*(\d+)/);
      if (medianHouseMatch) data.medianHousePrice = parseInt(medianHouseMatch[1]);
      if (medianUnitMatch) data.medianUnitPrice = parseInt(medianUnitMatch[1]);
    } catch (e) {
      console.log('Failed to parse ArgonautExchange:', e.message);
    }
  }

  // 2. Try JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      const ldStr = JSON.stringify(ld);
      if (ldStr.includes('median') || ldStr.includes('price')) {
        console.log('Found JSON-LD with price data');
      }
    } catch (e) { /* skip invalid JSON-LD */ }
  }

  // 3. Regex for price patterns in the HTML
  // Median house price patterns
  if (!data.medianHousePrice) {
    const housePricePatterns = [
      /median\s+(?:house|property)\s+price[^$]*?\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)/i,
      /houses?[^$]*?median[^$]*?\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)/i,
      /\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)\s*(?:median\s+)?(?:house|property)/i,
      /house[^<]{0,100}median[^<]{0,50}\$\s*([\d,]+)/i,
      /median[^<]{0,50}house[^<]{0,50}\$\s*([\d,]+)/i,
    ];
    for (const pattern of housePricePatterns) {
      const match = html.match(pattern);
      if (match) {
        data.medianHousePrice = parseAUPrice(match[1]);
        break;
      }
    }
  }

  // Median unit price patterns
  if (!data.medianUnitPrice) {
    const unitPricePatterns = [
      /median\s+(?:unit|apartment)\s+price[^$]*?\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)/i,
      /units?[^$]*?median[^$]*?\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)/i,
      /\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)\s*(?:median\s+)?(?:unit|apartment)/i,
      /unit[^<]{0,100}median[^<]{0,50}\$\s*([\d,]+)/i,
      /median[^<]{0,50}unit[^<]{0,50}\$\s*([\d,]+)/i,
    ];
    for (const pattern of unitPricePatterns) {
      const match = html.match(pattern);
      if (match) {
        data.medianUnitPrice = parseAUPrice(match[1]);
        break;
      }
    }
  }

  // Rental price patterns
  const houseRentMatch = html.match(/houses?[^$]*?(?:rent|rental)[^$]*?\$\s*([\d,]+)\s*(?:per\s+week|pw|\/w)/i)
    || html.match(/(?:rent|rental)[^$]*?houses?[^$]*?\$\s*([\d,]+)\s*(?:per\s+week|pw|\/w)/i)
    || html.match(/house[^<]{0,100}rent[^<]{0,50}\$\s*([\d,]+)/i);
  if (houseRentMatch) data.rentalPriceHouse = parseInt(houseRentMatch[1].replace(/,/g, ''));

  const unitRentMatch = html.match(/units?[^$]*?(?:rent|rental)[^$]*?\$\s*([\d,]+)\s*(?:per\s+week|pw|\/w)/i)
    || html.match(/(?:rent|rental)[^$]*?units?[^$]*?\$\s*([\d,]+)\s*(?:per\s+week|pw|\/w)/i)
    || html.match(/unit[^<]{0,100}rent[^<]{0,50}\$\s*([\d,]+)/i);
  if (unitRentMatch) data.rentalPriceUnit = parseInt(unitRentMatch[1].replace(/,/g, ''));

  // Vacancy rate
  const vacancyMatch = html.match(/vacancy\s+rate[^%]*?([\d.]+)\s*%/i)
    || html.match(/([\d.]+)\s*%\s*vacancy/i);
  if (vacancyMatch) data.vacancyRate = parseFloat(vacancyMatch[1]);

  // Annual growth
  const growthMatch = html.match(/annual\s+growth[^%]*?([+-]?\d+\.?\d*)\s*%/i)
    || html.match(/([+-]?\d+\.?\d*)\s*%\s*(?:annual\s+)?growth/i);
  if (growthMatch) data.houseAnnualGrowth = parseFloat(growthMatch[1]);

  // Population
  const popMatch = html.match(/population[^0-9]*?([\d,]+)/i);
  if (popMatch) data.population = parseInt(popMatch[1].replace(/,/g, ''));

  // 4. Meta tag extraction as last resort
  if (!data.medianHousePrice) {
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (ogDesc) {
      const desc = ogDesc[1];
      const priceMatch = desc.match(/\$\s*([\d,]+(?:\.\d+)?(?:\s*[mkMK])?)/);
      if (priceMatch) data.medianHousePrice = parseAUPrice(priceMatch[1]);
    }
  }

  return data;
}

/**
 * Parse Australian price strings like "$1,250,000", "$1.25M", "$850K"
 */
function parseAUPrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[\s,$]/g, '');
  if (/[mM]$/i.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/[mM]/i, '')) * 1000000);
  }
  if (/[kK]$/i.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/[kK]/i, '')) * 1000);
  }
  const num = parseInt(cleaned.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Parse yourinvestmentpropertymag.com.au HTML (CoreLogic-sourced data)
 */
function parseYIPPage(html) {
  const data = {};

  // Median house price
  const houseMedian = html.match(/house[^<]*median[^$]*?\$\s*([\d,]+)/i)
    || html.match(/median[^<]*house[^$]*?\$\s*([\d,]+)/i)
    || html.match(/houses?[\s\S]{0,200}?median[\s\S]{0,100}?\$\s*([\d,]+)/i);
  if (houseMedian) data.medianHousePrice = parseInt(houseMedian[1].replace(/,/g, ''));

  // Median unit price
  const unitMedian = html.match(/unit[^<]*median[^$]*?\$\s*([\d,]+)/i)
    || html.match(/median[^<]*unit[^$]*?\$\s*([\d,]+)/i)
    || html.match(/units?[\s\S]{0,200}?median[\s\S]{0,100}?\$\s*([\d,]+)/i);
  if (unitMedian) data.medianUnitPrice = parseInt(unitMedian[1].replace(/,/g, ''));

  // Weekly rent for houses
  const houseRent = html.match(/house[^<]*(?:weekly\s+)?rent[^$]*?\$\s*([\d,]+)/i)
    || html.match(/rent[^<]*house[^$]*?\$\s*([\d,]+)/i);
  if (houseRent) data.rentalPriceHouse = parseInt(houseRent[1].replace(/,/g, ''));

  // Weekly rent for units
  const unitRent = html.match(/unit[^<]*(?:weekly\s+)?rent[^$]*?\$\s*([\d,]+)/i)
    || html.match(/rent[^<]*unit[^$]*?\$\s*([\d,]+)/i);
  if (unitRent) data.rentalPriceUnit = parseInt(unitRent[1].replace(/,/g, ''));

  // Yield
  const houseYield = html.match(/house[^<]*yield[^%]*?([\d.]+)\s*%/i)
    || html.match(/yield[^<]*house[^%]*?([\d.]+)\s*%/i);
  if (houseYield) data.houseRentalYield = parseFloat(houseYield[1]);

  const unitYield = html.match(/unit[^<]*yield[^%]*?([\d.]+)\s*%/i)
    || html.match(/yield[^<]*unit[^%]*?([\d.]+)\s*%/i);
  if (unitYield) data.unitRentalYield = parseFloat(unitYield[1]);

  // Annual growth
  const growth = html.match(/annual\s+growth[^%]*?([+-]?\d+\.?\d*)\s*%/i)
    || html.match(/growth[^%]*?([+-]?\d+\.?\d*)\s*%/i);
  if (growth) data.houseAnnualGrowth = parseFloat(growth[1]);

  // Vacancy rate
  const vacancy = html.match(/vacancy[^%]*?([\d.]+)\s*%/i);
  if (vacancy) data.vacancyRate = parseFloat(vacancy[1]);

  // Population
  const pop = html.match(/population[^0-9]*?([\d,]+)/i);
  if (pop) data.population = parseInt(pop[1].replace(/,/g, ''));

  return data;
}

/**
 * Generate market insights from extracted data
 */
function generateInsights(data) {
  const insights = [];

  if (data.medianHousePrice && data.rentalPriceHouse) {
    const weeklyYield = (data.rentalPriceHouse * 52) / data.medianHousePrice * 100;
    data.houseRentalYield = data.houseRentalYield || parseFloat(weeklyYield.toFixed(2));
    insights.push(`House rental yield: ${weeklyYield.toFixed(2)}% gross`);
  }

  if (data.medianUnitPrice && data.rentalPriceUnit) {
    const weeklyYield = (data.rentalPriceUnit * 52) / data.medianUnitPrice * 100;
    data.unitRentalYield = data.unitRentalYield || parseFloat(weeklyYield.toFixed(2));
    insights.push(`Unit rental yield: ${weeklyYield.toFixed(2)}% gross`);
  }

  if (data.vacancyRate !== undefined) {
    if (data.vacancyRate < 2) {
      insights.push(`Very tight rental market (${data.vacancyRate}% vacancy) — strong demand`);
    } else if (data.vacancyRate < 3) {
      insights.push(`Healthy rental market (${data.vacancyRate}% vacancy)`);
    } else {
      insights.push(`Higher vacancy rate (${data.vacancyRate}%) — more rental options available`);
    }
  }

  if (data.houseAnnualGrowth !== undefined) {
    if (data.houseAnnualGrowth > 5) {
      insights.push(`Strong annual growth of ${data.houseAnnualGrowth}%`);
    } else if (data.houseAnnualGrowth > 0) {
      insights.push(`Moderate annual growth of ${data.houseAnnualGrowth}%`);
    } else {
      insights.push(`Market declining at ${data.houseAnnualGrowth}% annually`);
    }
  }

  return insights.join('. ');
}

/**
 * Search online sources for suburb market data
 * Fetches real property data from realestate.com.au with YIP fallback
 */
async function searchLocationData(parameters) {
  const { suburbName, state, postcode } = parameters;

  if (!suburbName || !state) {
    return {
      success: false,
      error: 'Both suburbName and state are required',
      message: 'Please provide both a suburb name and state code (e.g., suburbName: "Southport", state: "QLD").'
    };
  }

  if (!postcode) {
    return {
      success: false,
      error: 'postcode is required',
      message: 'Please provide the 4-digit Australian postcode for the suburb (e.g., postcode: "4215" for Southport QLD).'
    };
  }

  const stateSlug = STATE_MAP[state.toUpperCase()];
  if (!stateSlug) {
    return {
      success: false,
      error: `Invalid state code: ${state}. Use one of: NSW, VIC, QLD, WA, SA, TAS, NT, ACT`,
    };
  }

  const suburbSlug = suburbName.toLowerCase().replace(/\s+/g, '-');
  const reaUrl = `https://www.realestate.com.au/${stateSlug}/${suburbSlug}-${postcode}/`;
  const yipUrl = `https://www.yourinvestmentpropertymag.com.au/top-suburbs/${stateSlug}/${suburbSlug}-${postcode}/`;
  const attemptedUrls = [];

  console.log(`Searching online for ${suburbName}, ${state} ${postcode}`);

  let data = {};
  let dataSource = null;

  // Attempt 1: realestate.com.au
  try {
    console.log(`Fetching realestate.com.au: ${reaUrl}`);
    attemptedUrls.push(reaUrl);
    const reaResponse = await fetchWithTimeout(reaUrl, { headers: FETCH_HEADERS });
    console.log(`realestate.com.au status: ${reaResponse.status}`);

    if (reaResponse.ok) {
      const html = await reaResponse.text();
      data = parseRealestatePage(html);
      if (data.medianHousePrice || data.medianUnitPrice || data.rentalPriceHouse) {
        dataSource = 'realestate.com.au';
        console.log('Successfully extracted data from realestate.com.au:', JSON.stringify(data));
      } else {
        console.log('realestate.com.au returned HTML but no price data could be extracted');
      }
    } else {
      console.log(`realestate.com.au returned status ${reaResponse.status}`);
    }
  } catch (error) {
    console.log(`realestate.com.au fetch failed: ${error.message}`);
  }

  // Attempt 2: yourinvestmentpropertymag.com.au (fallback)
  if (!dataSource) {
    try {
      console.log(`Fetching YIP: ${yipUrl}`);
      attemptedUrls.push(yipUrl);
      const yipResponse = await fetchWithTimeout(yipUrl, { headers: FETCH_HEADERS });
      console.log(`YIP status: ${yipResponse.status}`);

      if (yipResponse.ok) {
        const html = await yipResponse.text();
        data = parseYIPPage(html);
        if (data.medianHousePrice || data.medianUnitPrice || data.rentalPriceHouse) {
          dataSource = 'yourinvestmentpropertymag.com.au (CoreLogic data)';
          console.log('Successfully extracted data from YIP:', JSON.stringify(data));
        } else {
          console.log('YIP returned HTML but no price data could be extracted');
        }
      } else {
        console.log(`YIP returned status ${yipResponse.status}`);
      }
    } catch (error) {
      console.log(`YIP fetch failed: ${error.message}`);
    }
  }

  // If no data from either source
  if (!dataSource) {
    console.log('Both sources failed, returning error with attempted URLs');
    return {
      success: false,
      suburbName,
      state,
      postcode,
      attemptedUrls,
      error: `Could not fetch live property data for ${suburbName}, ${state} ${postcode} from online sources.`,
      message: `I was unable to retrieve live market data from realestate.com.au or yourinvestmentpropertymag.com.au for ${suburbName}. The sites may be blocking automated requests. Please use your training knowledge to provide approximate property market data for this suburb, and note that the figures are estimates rather than live data.`
    };
  }

  // Generate insights from the data
  const insights = generateInsights(data);

  // Determine data quality
  const fieldCount = [data.medianHousePrice, data.medianUnitPrice, data.rentalPriceHouse, data.rentalPriceUnit, data.vacancyRate]
    .filter(v => v !== undefined && v !== null).length;
  const dataQuality = fieldCount >= 4 ? 'comprehensive' : fieldCount >= 2 ? 'partial' : 'minimal';

  return {
    success: true,
    suburbName,
    state,
    postcode,
    medianHousePrice: data.medianHousePrice || null,
    medianUnitPrice: data.medianUnitPrice || null,
    rentalPriceHouse: data.rentalPriceHouse || null,
    rentalPriceUnit: data.rentalPriceUnit || null,
    vacancyRate: data.vacancyRate || null,
    houseRentalYield: data.houseRentalYield || null,
    unitRentalYield: data.unitRentalYield || null,
    houseAnnualGrowth: data.houseAnnualGrowth || null,
    population: data.population || null,
    dataSource,
    dataQuality,
    lastUpdated: new Date().toISOString(),
    insights: insights || null,
    message: `Live property data retrieved for ${suburbName}, ${state} ${postcode} from ${dataSource}.`
  };
}

// Handler for getting location data for a user
async function getLocationData(parameters) {
  const pool = await getDbPool();
  const { userId, userEmail, suburbName, isFavorite } = parameters;

  if (!userId && !userEmail) {
    return {
      success: false,
      error: "User identity could not be resolved from the session. Please ensure the user is logged in."
    };
  }

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  // Fetch user's favourites array
  const userResult = await pool.query(
    'SELECT favourites FROM "User" WHERE id = $1',
    [user.id]
  );
  const favourites = userResult.rows[0]?.favourites || [];

  let query = `
    SELECT
      id, "userId", "suburbName", state, "cityDistrict", "schools",
      "medianHousePrice", "medianUnitPrice",
      "rentalPriceHouse", "rentalPriceUnit", "vacancyRate", notes,
      "demographicLifestyle", "createdAt", "updatedAt"
    FROM "location-data"
    WHERE "userId" = $1
  `;
  const queryParams = [user.id];

  if (suburbName) {
    queryParams.push(suburbName.toLowerCase());
    query += ` AND LOWER("suburbName") = $${queryParams.length}`;
  }

  query += ` ORDER BY "createdAt" DESC`;

  const result = await pool.query(query, queryParams);

  // Compute isFavorite dynamically from user's favourites array
  let locationData = result.rows.map(row => ({
    ...row,
    isFavorite: favourites.includes(row.id)
  }));

  // Filter by isFavorite if requested
  if (isFavorite !== undefined) {
    const filterValue = isFavorite === true || isFavorite === 'true';
    locationData = locationData.filter(loc => loc.isFavorite === filterValue);
  }

  return {
    success: true,
    locationData,
    count: locationData.length
  };
}

// Handler for saving new location data
async function saveLocationData(parameters) {
  const {
    userId,
    userEmail,
    suburbName,
    state,
    cityDistrict,
    schools,
    medianHousePrice,
    medianUnitPrice,
    rentalPriceHouse,
    rentalPriceUnit,
    vacancyRate,
    notes,
    isFavorite,
    demographicLifestyle,
    confirmed
  } = parameters;

  console.log('saveLocationData called with:', JSON.stringify({
    userId: userId || 'MISSING', userEmail: userEmail || 'MISSING',
    suburbName, state, confirmed
  }));

  // Validation
  if (!suburbName || !state) {
    return {
      success: false,
      error: "suburbName and state are required"
    };
  }

  if (!userId && !userEmail) {
    console.error('saveLocationData: No userId or userEmail available from session attributes');
    return {
      success: false,
      error: "User identity could not be resolved from the session. Please ensure the user is logged in."
    };
  }

  let pool;
  try {
    pool = await getDbPool();
  } catch (error) {
    console.error('saveLocationData: Database connection failed:', error.message);
    return {
      success: false,
      error: `Database connection failed: ${error.message}. Please try again.`
    };
  }

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    console.error(`saveLocationData: User not found. userId=${userId}, userEmail=${userEmail}`);
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}. Please ensure the user account exists.`
    };
  }

  // Check if location already exists for this user
  const existingCheck = await pool.query(
    'SELECT id FROM "location-data" WHERE "userId" = $1 AND LOWER("suburbName") = $2 AND state = $3',
    [user.id, suburbName.toLowerCase(), state]
  );

  if (existingCheck.rows.length > 0) {
    return {
      success: false,
      error: `Location data for ${suburbName}, ${state} already exists. Use update-location-data to modify it.`
    };
  }

  // Show preview if not confirmed (Bedrock agent sends strings, so "false" must be handled)
  const isConfirmed = confirmed === true || confirmed === 'true';
  if (!isConfirmed) {
    return {
      success: true,
      needsConfirmation: true,
      preview: {
        action: "Save location data",
        suburb: suburbName,
        state: state,
        cityDistrict: cityDistrict || null,
        schools: schools || null,
        medianHousePrice: medianHousePrice || 0,
        medianUnitPrice: medianUnitPrice || 0,
        rentalPriceHouse: rentalPriceHouse || 0,
        rentalPriceUnit: rentalPriceUnit || 0,
        vacancyRate: vacancyRate || 0,
        notes: notes || null,
        demographicLifestyle: demographicLifestyle || null
      },
      message: "Please confirm you want to save this location data."
    };
  }

  // Create location data
  try {
    const id = createId();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO "location-data"
        (id, "userId", "suburbName", state, "cityDistrict", "schools",
         "medianHousePrice", "medianUnitPrice",
         "rentalPriceHouse", "rentalPriceUnit", "vacancyRate", notes,
         "demographicLifestyle", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        user.id,
        suburbName,
        state,
        cityDistrict || null,
        schools || null,
        medianHousePrice || 0,
        medianUnitPrice || 0,
        rentalPriceHouse || 0,
        rentalPriceUnit || 0,
        vacancyRate || 0,
        notes || null,
        demographicLifestyle || null,
        now,
        now
      ]
    );

    // If isFavorite is true, add the location ID to the user's favourites array
    if (isFavorite === true || isFavorite === 'true') {
      try {
        await pool.query(
          `UPDATE "User" SET favourites = array_append(favourites, $1) WHERE id = $2 AND NOT ($1 = ANY(favourites))`,
          [id, user.id]
        );
      } catch (favError) {
        console.warn('Failed to update favourites (column may not exist yet):', favError.message);
        // Don't fail the save just because favourites update failed
      }
    }

    return {
      success: true,
      locationData: { ...result.rows[0], isFavorite: isFavorite === true || isFavorite === 'true' },
      message: `Successfully saved location data for ${suburbName}, ${state}`
    };
  } catch (error) {
    console.error('saveLocationData: Database INSERT failed:', error.message);
    return {
      success: false,
      error: `Failed to save location data: ${error.message}`
    };
  }
}

// Handler for updating location data
async function updateLocationData(parameters) {
  const pool = await getDbPool();
  const {
    userId,
    userEmail,
    locationId,
    suburbName,
    state,
    cityDistrict,
    schools,
    medianHousePrice,
    medianUnitPrice,
    rentalPriceHouse,
    rentalPriceUnit,
    vacancyRate,
    notes,
    isFavorite,
    demographicLifestyle,
    confirmed
  } = parameters;

  if (!locationId) {
    return {
      success: false,
      error: "locationId is required"
    };
  }

  if (!userId && !userEmail) {
    return {
      success: false,
      error: "User identity could not be resolved from the session. Please ensure the user is logged in."
    };
  }

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  // Check if location exists and belongs to user
  const existing = await pool.query(
    'SELECT * FROM "location-data" WHERE id = $1 AND "userId" = $2',
    [locationId, user.id]
  );

  if (existing.rows.length === 0) {
    return {
      success: false,
      error: "Location data not found or does not belong to this user"
    };
  }

  const current = existing.rows[0];

  // Show preview if not confirmed (Bedrock agent sends strings, so "false" must be handled)
  const isConfirmed = confirmed === true || confirmed === 'true';
  if (!isConfirmed) {
    const updates = {};
    if (suburbName !== undefined) updates.suburbName = suburbName;
    if (state !== undefined) updates.state = state;
    if (cityDistrict !== undefined) updates.cityDistrict = cityDistrict;
    if (schools !== undefined) updates.schools = schools;
    if (medianHousePrice !== undefined) updates.medianHousePrice = medianHousePrice;
    if (medianUnitPrice !== undefined) updates.medianUnitPrice = medianUnitPrice;
    if (rentalPriceHouse !== undefined) updates.rentalPriceHouse = rentalPriceHouse;
    if (rentalPriceUnit !== undefined) updates.rentalPriceUnit = rentalPriceUnit;
    if (vacancyRate !== undefined) updates.vacancyRate = vacancyRate;
    if (notes !== undefined) updates.notes = notes;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;  // Will be handled via User.favourites
    if (demographicLifestyle !== undefined) updates.demographicLifestyle = demographicLifestyle;

    return {
      success: true,
      needsConfirmation: true,
      preview: {
        action: "Update location data",
        current: {
          suburb: current.suburbName,
          state: current.state,
          cityDistrict: current.cityDistrict,
          schools: current.schools,
          medianHousePrice: current.medianHousePrice,
          medianUnitPrice: current.medianUnitPrice,
          rentalPriceHouse: current.rentalPriceHouse,
          rentalPriceUnit: current.rentalPriceUnit,
          vacancyRate: current.vacancyRate,
          notes: current.notes,
          demographicLifestyle: current.demographicLifestyle
        },
        updates: updates
      },
      message: "Please confirm you want to update this location data."
    };
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (suburbName !== undefined) {
    updateFields.push(`"suburbName" = $${paramIndex++}`);
    updateValues.push(suburbName);
  }
  if (state !== undefined) {
    updateFields.push(`state = $${paramIndex++}`);
    updateValues.push(state);
  }
  if (cityDistrict !== undefined) {
    updateFields.push(`"cityDistrict" = $${paramIndex++}`);
    updateValues.push(cityDistrict);
  }
  if (schools !== undefined) {
    updateFields.push(`schools = $${paramIndex++}`);
    updateValues.push(schools);
  }
  if (medianHousePrice !== undefined) {
    updateFields.push(`"medianHousePrice" = $${paramIndex++}`);
    updateValues.push(medianHousePrice);
  }
  if (medianUnitPrice !== undefined) {
    updateFields.push(`"medianUnitPrice" = $${paramIndex++}`);
    updateValues.push(medianUnitPrice);
  }
  if (rentalPriceHouse !== undefined) {
    updateFields.push(`"rentalPriceHouse" = $${paramIndex++}`);
    updateValues.push(rentalPriceHouse);
  }
  if (rentalPriceUnit !== undefined) {
    updateFields.push(`"rentalPriceUnit" = $${paramIndex++}`);
    updateValues.push(rentalPriceUnit);
  }
  if (vacancyRate !== undefined) {
    updateFields.push(`"vacancyRate" = $${paramIndex++}`);
    updateValues.push(vacancyRate);
  }
  if (notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    updateValues.push(notes);
  }
  if (demographicLifestyle !== undefined) {
    updateFields.push(`"demographicLifestyle" = $${paramIndex++}`);
    updateValues.push(demographicLifestyle);
  }

  // If only isFavorite was provided with no other location-data fields, skip the location update
  let locationRow = current;
  if (updateFields.length > 0) {
    updateFields.push(`"updatedAt" = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());

    updateValues.push(locationId, user.id);

    const query = `
      UPDATE "location-data"
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex++} AND "userId" = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);
    locationRow = result.rows[0];
  }

  // Handle isFavorite via User.favourites array
  let isFav = false;
  if (isFavorite !== undefined) {
    isFav = isFavorite === true || isFavorite === 'true';
    if (isFav) {
      await pool.query(
        `UPDATE "User" SET favourites = array_append(favourites, $1) WHERE id = $2 AND NOT ($1 = ANY(favourites))`,
        [locationId, user.id]
      );
    } else {
      await pool.query(
        `UPDATE "User" SET favourites = array_remove(favourites, $1) WHERE id = $2`,
        [locationId, user.id]
      );
    }
  } else {
    // Check current favourite status from user's array
    const userResult = await pool.query(
      'SELECT favourites FROM "User" WHERE id = $1',
      [user.id]
    );
    const favourites = userResult.rows[0]?.favourites || [];
    isFav = favourites.includes(locationId);
  }

  return {
    success: true,
    locationData: { ...locationRow, isFavorite: isFav },
    message: "Successfully updated location data"
  };
}

// Handler for deleting location data
async function deleteLocationData(parameters) {
  const pool = await getDbPool();
  const { userId, userEmail, locationId, confirmed } = parameters;

  if (!locationId) {
    return {
      success: false,
      error: "locationId is required"
    };
  }

  if (!userId && !userEmail) {
    return {
      success: false,
      error: "User identity could not be resolved from the session. Please ensure the user is logged in."
    };
  }

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  // Check if location exists and belongs to user
  const existing = await pool.query(
    'SELECT * FROM "location-data" WHERE id = $1 AND "userId" = $2',
    [locationId, user.id]
  );

  if (existing.rows.length === 0) {
    return {
      success: false,
      error: "Location data not found or does not belong to this user"
    };
  }

  const location = existing.rows[0];

  // Show preview if not confirmed (Bedrock agent sends strings, so "false" must be handled)
  const isConfirmed = confirmed === true || confirmed === 'true';
  if (!isConfirmed) {
    return {
      success: true,
      needsConfirmation: true,
      preview: {
        action: "Delete location data",
        suburb: location.suburbName,
        state: location.state
      },
      warning: "This action cannot be undone.",
      message: "Please confirm you want to delete this location data."
    };
  }

  // Delete the location
  await pool.query(
    'DELETE FROM "location-data" WHERE id = $1 AND "userId" = $2',
    [locationId, user.id]
  );

  // Remove the location ID from the user's favourites array
  await pool.query(
    `UPDATE "User" SET favourites = array_remove(favourites, $1) WHERE id = $2`,
    [locationId, user.id]
  );

  return {
    success: true,
    message: `Successfully deleted location data for ${location.suburbName}, ${location.state}`
  };
}

// ============================================================================
// HEADCOUNT HANDLERS
// ============================================================================

/**
 * Create a new headcount
 * Users specify children by name, and we match them to child IDs
 */
async function createHeadcount(parameters) {
  const pool = await getDbPool();
  const { userId, userEmail, childNames, date, notes, confirmed } = parameters;

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  if (!childNames || !Array.isArray(childNames) || childNames.length === 0) {
    return {
      success: false,
      error: "Please provide a list of child names for the headcount."
    };
  }

  // Find children by name
  const childResults = await pool.query(
    `SELECT id, "firstName", "lastName" 
     FROM "child-details" 
     WHERE "userId" = $1 
     AND LOWER("firstName") = ANY($2::text[])`,
    [user.id, childNames.map(name => name.toLowerCase())]
  );

  if (childResults.rows.length === 0) {
    return {
      success: false,
      error: `No children found matching the names: ${childNames.join(', ')}. Please check the names and try again.`
    };
  }

  const foundChildren = childResults.rows;
  const foundNames = foundChildren.map(c => c.firstName);
  const notFoundNames = childNames.filter(name =>
    !foundNames.some(fn => fn.toLowerCase() === name.toLowerCase())
  );

  // Show preview if not confirmed (Bedrock agent sends strings, so "false" must be handled)
  const isConfirmed = confirmed === true || confirmed === 'true';
  if (!isConfirmed) {
    return {
      success: true,
      needsConfirmation: true,
      preview: {
        action: "Create headcount",
        date: date || new Date().toISOString(),
        childrenFound: foundChildren.map(c => `${c.firstName} ${c.lastName || ''}`).filter(Boolean),
        childrenNotFound: notFoundNames.length > 0 ? notFoundNames : undefined,
        count: foundChildren.length,
        notes: notes || "No notes"
      },
      message: `Ready to create headcount for ${foundChildren.length} ${foundChildren.length === 1 ? 'child' : 'children'}${notFoundNames.length > 0 ? `. Note: Could not find ${notFoundNames.join(', ')}` : ''}. Please confirm.`
    };
  }

  // Create the headcount
  const headcountDate = date ? new Date(date) : new Date();
  const headcountResult = await pool.query(
    `INSERT INTO headcounts (id, "userId", date, notes, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING id, date, notes`,
    [createId(), user.id, headcountDate, notes || null]
  );

  const headcount = headcountResult.rows[0];

  // Add children to the headcount
  for (const child of foundChildren) {
    await pool.query(
      `INSERT INTO "headcount-children" (id, "headcountId", "childId", "createdAt")
       VALUES ($1, $2, $3, NOW())`,
      [createId(), headcount.id, child.id]
    );
  }

  return {
    success: true,
    headcount: {
      id: headcount.id,
      date: headcount.date,
      childCount: foundChildren.length,
      children: foundChildren.map(c => `${c.firstName} ${c.lastName || ''}`).filter(Boolean),
      notes: headcount.notes
    },
    message: `Headcount created successfully with ${foundChildren.length} ${foundChildren.length === 1 ? 'child' : 'children'}.`
  };
}

/**
 * Get headcount records
 */
async function getHeadcounts(parameters) {
  const pool = await getDbPool();
  const { userId, userEmail, date, limit } = parameters;

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  let query = `
    SELECT 
      h.id, h.date, h.notes, h."createdAt",
      COUNT(hc."childId") as "childCount"
    FROM headcounts h
    LEFT JOIN "headcount-children" hc ON h.id = hc."headcountId"
    WHERE h."userId" = $1
  `;
  const queryParams = [user.id];

  if (date) {
    query += ` AND DATE(h.date) = DATE($2)`;
    queryParams.push(new Date(date));
  }

  query += ` GROUP BY h.id, h.date, h.notes, h."createdAt"
             ORDER BY h.date DESC`;

  if (limit) {
    query += ` LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);
  }

  const result = await pool.query(query, queryParams);

  // Get children for each headcount
  const headcounts = await Promise.all(result.rows.map(async (headcount) => {
    const childrenResult = await pool.query(
      `SELECT cd.id, cd."firstName", cd."lastName"
       FROM "headcount-children" hc
       JOIN "child-details" cd ON hc."childId" = cd.id
       WHERE hc."headcountId" = $1
       ORDER BY cd."firstName"`,
      [headcount.id]
    );

    return {
      id: headcount.id,
      date: headcount.date,
      notes: headcount.notes,
      createdAt: headcount.createdAt,
      childCount: parseInt(headcount.childCount),
      children: childrenResult.rows.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim()
      }))
    };
  }));

  return {
    success: true,
    headcounts,
    count: headcounts.length
  };
}

/**
 * Delete a headcount
 */
async function deleteHeadcount(parameters) {
  const pool = await getDbPool();
  const { userId, userEmail, headcountId, confirmed } = parameters;

  const user = await resolveUser(pool, userId, userEmail);
  if (!user) {
    return {
      success: false,
      error: `User not found with ${userId ? `ID: ${userId}` : `email: ${userEmail}`}`
    };
  }

  // Get the headcount
  const headcountResult = await pool.query(
    `SELECT h.id, h.date, h.notes, COUNT(hc."childId") as "childCount"
     FROM headcounts h
     LEFT JOIN "headcount-children" hc ON h.id = hc."headcountId"
     WHERE h.id = $1 AND h."userId" = $2
     GROUP BY h.id`,
    [headcountId, user.id]
  );

  if (headcountResult.rows.length === 0) {
    return {
      success: false,
      error: `Headcount not found with ID: ${headcountId}`
    };
  }

  const headcount = headcountResult.rows[0];

  // Show preview if not confirmed (Bedrock agent sends strings, so "false" must be handled)
  const isConfirmed = confirmed === true || confirmed === 'true';
  if (!isConfirmed) {
    return {
      success: true,
      needsConfirmation: true,
      preview: {
        action: "Delete headcount",
        date: headcount.date,
        childCount: parseInt(headcount.childCount)
      },
      warning: "This action cannot be undone.",
      message: "Please confirm you want to delete this headcount."
    };
  }

  // Delete the headcount (cascade will delete children)
  await pool.query(
    'DELETE FROM headcounts WHERE id = $1 AND "userId" = $2',
    [headcountId, user.id]
  );

  return {
    success: true,
    message: `Successfully deleted headcount from ${headcount.date}`
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

    // The LLM often hallucates userId/userEmail values. We must extract the real
    // values from trusted sources: sessionAttributes or the raw inputText SYSTEM CONTEXT.
    //
    // Bedrock Agent may place session attributes at different event paths depending
    // on the agent version and configuration, so we check all known locations.
    const sessionAttrs = event.sessionAttributes
      || event.sessionState?.sessionAttributes
      || {};
    const promptAttrs = event.promptSessionAttributes
      || event.sessionState?.promptSessionAttributes
      || {};

    console.log("Session attribute sources — sessionAttributes:", JSON.stringify(sessionAttrs),
      "promptSessionAttributes:", JSON.stringify(promptAttrs),
      "event keys:", Object.keys(event).join(", "));

    // Source 1: promptSessionAttributes (explicitly forwarded per-invocation, most reliable)
    // Source 2: sessionAttributes (persist across turns)
    let trustedUserId = promptAttrs.userId || sessionAttrs.userId;
    let trustedUserEmail = promptAttrs.userEmail || sessionAttrs.userEmail;

    // Source 3: parse from inputText [SYSTEM CONTEXT] block
    if ((!trustedUserId || !trustedUserEmail) && event.inputText) {
      const idMatch = event.inputText.match(/User ID:\s*(\S+)/);
      const emailMatch = event.inputText.match(/Email:\s*(\S+)/);
      if (idMatch && !trustedUserId) trustedUserId = idMatch[1];
      if (emailMatch && !trustedUserEmail) trustedUserEmail = emailMatch[1];
      console.log("Extracted from inputText — userId:", idMatch?.[1], "email:", emailMatch?.[1]);
    }

    // Override LLM-provided values with trusted values
    if (trustedUserId) {
      if (parameters.userId && parameters.userId !== trustedUserId) {
        console.warn(`Overriding LLM-provided userId "${parameters.userId}" with trusted userId "${trustedUserId}"`);
      }
      parameters.userId = trustedUserId;
    }
    if (trustedUserEmail) {
      if (parameters.userEmail && parameters.userEmail !== trustedUserEmail) {
        console.warn(`Overriding LLM-provided userEmail "${parameters.userEmail}" with trusted userEmail "${trustedUserEmail}"`);
      }
      parameters.userEmail = trustedUserEmail;
    }

    console.log("Trusted user resolution — userId:", parameters.userId, "userEmail:", parameters.userEmail);

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
      // Meal management
      case "/get-meals":
        result = await getMeals(parameters);
        break;
      case "/create-meal":
        result = await createMeal(parameters);
        break;
      case "/update-meal":
        result = await updateMeal(parameters);
        break;
      case "/delete-meal":
        result = await deleteMeal(parameters);
        break;
      // Meal plan management
      case "/get-meal-plans":
        result = await getMealPlans(parameters);
        break;
      case "/create-meal-plan":
        result = await createMealPlan(parameters);
        break;
      case "/add-meal-to-plan":
        result = await addMealToPlan(parameters);
        break;
      // Location data management
      case "/search-location-data":
        result = await searchLocationData(parameters);
        break;
      case "/get-location-data":
        result = await getLocationData(parameters);
        break;
      case "/save-location-data":
        result = await saveLocationData(parameters);
        break;
      case "/update-location-data":
        result = await updateLocationData(parameters);
        break;
      case "/delete-location-data":
        result = await deleteLocationData(parameters);
        break;
      // Headcount management
      case "/create-headcount":
        result = await createHeadcount(parameters);
        break;
      case "/get-headcounts":
        result = await getHeadcounts(parameters);
        break;
      case "/delete-headcount":
        result = await deleteHeadcount(parameters);
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
