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

// Handler for getting child events
async function getChildEvents(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId) {
    throw new Error("childId is required");
  }

  const query = `
    SELECT
      id, name, "eventType", "childId",
      "createdAt", "updatedAt"
    FROM "child-events"
    WHERE "childId" = $1
    ORDER BY "createdAt" DESC
  `;

  const result = await pool.query(query, [parameters.childId]);

  return {
    events: result.rows,
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

// Handler for getting event statistics
async function getEventStatistics(parameters) {
  const pool = await getDbPool();

  let query = `
    SELECT
      "eventType",
      COUNT(*) as count,
      MIN("createdAt") as earliest,
      MAX("createdAt") as latest
    FROM "child-events"
  `;

  const queryParams = [];

  if (parameters.childId) {
    queryParams.push(parameters.childId);
    query += ` WHERE "childId" = $${queryParams.length}`;
  }

  query += ' GROUP BY "eventType" ORDER BY count DESC';

  const result = await pool.query(query, queryParams);

  // Get total counts
  let totalQuery = `
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT "childId") as total_children
    FROM "child-events"
  `;

  if (parameters.childId) {
    totalQuery += ` WHERE "childId" = $1`;
  }

  const totalResult = await pool.query(totalQuery, queryParams);

  return {
    eventsByType: result.rows,
    totals: totalResult.rows[0],
    filteredByChild: !!parameters.childId
  };
}

// Handler for creating a new child
async function createChild(parameters) {
  const pool = await getDbPool();

  if (!parameters.firstName || !parameters.dateOfBirth || !parameters.userId) {
    throw new Error("firstName, dateOfBirth, and userId are required");
  }

  // Verify user exists before creating child
  const userCheck = await pool.query('SELECT id FROM "User" WHERE id = $1', [parameters.userId]);
  if (userCheck.rows.length === 0) {
    throw new Error(`User with ID "${parameters.userId}" not found. Please provide a valid userId.`);
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
    parameters.userId,
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

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (parameters.firstName !== undefined) {
    updates.push(`"firstName" = $${paramIndex++}`);
    values.push(parameters.firstName);
  }
  if (parameters.lastName !== undefined) {
    updates.push(`"lastName" = $${paramIndex++}`);
    values.push(parameters.lastName);
  }
  if (parameters.dateOfBirth !== undefined) {
    updates.push(`"dateOfBirth" = $${paramIndex++}`);
    values.push(parameters.dateOfBirth);
  }
  if (parameters.gender !== undefined) {
    updates.push(`gender = $${paramIndex++}`);
    values.push(parameters.gender);
  }
  if (parameters.allergies !== undefined) {
    updates.push(`allergies = $${paramIndex++}`);
    values.push(parameters.allergies);
  }
  if (parameters.medicalInfo !== undefined) {
    updates.push(`"medicalInfo" = $${paramIndex++}`);
    values.push(parameters.medicalInfo);
  }
  if (parameters.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(parameters.notes);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
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

  // First, delete all associated events
  await pool.query('DELETE FROM "child-events" WHERE "childId" = $1', [parameters.childId]);

  // Then delete the child
  const result = await pool.query('DELETE FROM "child-details" WHERE id = $1 RETURNING "firstName", "lastName"', [parameters.childId]);

  if (result.rows.length === 0) {
    throw new Error("Child not found");
  }

  const child = result.rows[0];
  return {
    message: `Child ${child.firstName} ${child.lastName || ''} and all associated events deleted successfully`,
    deletedChildId: parameters.childId
  };
}

// Handler for creating a new event
async function createEvent(parameters) {
  const pool = await getDbPool();

  if (!parameters.childId || !parameters.name || !parameters.eventType) {
    throw new Error("childId, name, and eventType are required");
  }

  // Verify child exists
  const childCheck = await pool.query('SELECT id FROM "child-details" WHERE id = $1', [parameters.childId]);
  if (childCheck.rows.length === 0) {
    throw new Error("Child not found");
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

// Handler for updating an event
async function updateEvent(parameters) {
  const pool = await getDbPool();

  if (!parameters.eventId) {
    throw new Error("eventId is required");
  }

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (parameters.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(parameters.name);
  }
  if (parameters.eventType !== undefined) {
    updates.push(`"eventType" = $${paramIndex++}`);
    values.push(parameters.eventType);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  updates.push(`"updatedAt" = $${paramIndex++}`);
  values.push(new Date().toISOString());

  values.push(parameters.eventId);

  const query = `
    UPDATE "child-events"
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error("Event not found");
  }

  return {
    event: result.rows[0],
    message: "Event updated successfully"
  };
}

// Handler for deleting an event
async function deleteEvent(parameters) {
  const pool = await getDbPool();

  if (!parameters.eventId) {
    throw new Error("eventId is required");
  }

  const result = await pool.query('DELETE FROM "child-events" WHERE id = $1 RETURNING name', [parameters.eventId]);

  if (result.rows.length === 0) {
    throw new Error("Event not found");
  }

  const event = result.rows[0];
  return {
    message: `Event "${event.name}" deleted successfully`,
    deletedEventId: parameters.eventId
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
      case "/get-users":
        result = await getUsers(parameters);
        break;
      case "/get-children":
        result = await getChildren(parameters);
        break;
      case "/get-child-events":
        result = await getChildEvents(parameters);
        break;
      case "/get-child-details":
        result = await getChildDetails(parameters);
        break;
      case "/get-event-statistics":
        result = await getEventStatistics(parameters);
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
      case "/create-event":
        result = await createEvent(parameters);
        break;
      case "/update-event":
        result = await updateEvent(parameters);
        break;
      case "/delete-event":
        result = await deleteEvent(parameters);
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
