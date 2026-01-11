const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { Pool } = require("pg");

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

// Main Lambda handler
exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // Extract the action and parameters from the Bedrock Agent event
    const actionGroup = event.actionGroup;
    const apiPath = event.apiPath;
    const httpMethod = event.httpMethod;

    // Parse request body if present
    let parameters = {};
    if (event.requestBody && event.requestBody.content && event.requestBody.content["application/json"]) {
      parameters = JSON.parse(event.requestBody.content["application/json"].body);
    }

    console.log("Action:", apiPath, "Parameters:", parameters);

    let result;

    // Route to appropriate handler based on API path
    switch (apiPath) {
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
