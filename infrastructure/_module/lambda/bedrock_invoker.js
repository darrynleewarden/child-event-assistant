const {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} = require('@aws-sdk/client-bedrock-agent-runtime');
const crypto = require('crypto');

const client = new BedrockAgentRuntimeClient({});

// Generate a unique session ID if not provided
const generateSessionId = () => {
  return `session-${crypto.randomUUID()}`;
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { message, sessionId: providedSessionId, userId, userEmail, userName } = body;

    if (!message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Use provided session ID or generate a new one
    // This ensures conversation context is maintained across requests
    const sessionId = providedSessionId || generateSessionId();

    // Build input text with user context prepended (invisible to the user but available to the agent)
    let inputText = message;
    if (userId) {
      // Prepend user context as a system instruction that the agent can use
      // This tells the agent who the current user is so it can use their userId for database operations
      const userContext = [
        `[SYSTEM CONTEXT - Current User Information]`,
        `User ID: ${userId}`,
        userEmail ? `Email: ${userEmail}` : null,
        userName ? `Name: ${userName}` : null,
        `[END SYSTEM CONTEXT]`,
        ``,
        `User message: ${message}`
      ].filter(Boolean).join('\n');
      inputText = userContext;
    }

    // Invoke Bedrock Agent with session context
    const command = new InvokeAgentCommand({
      agentId: process.env.AGENT_ID,
      agentAliasId: process.env.AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: inputText,
      enableTrace: false,
      // Memory configuration is handled at the agent level
      // The session ID maintains conversation context
    });

    const response = await client.send(command);

    // Collect response chunks
    let completion = '';
    for await (const chunk of response.completion) {
      if (chunk.chunk && chunk.chunk.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        completion += text;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        message: completion,
        sessionId: sessionId, // Return the session ID for the client to reuse
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Failed to invoke agent',
        details: error.message,
      }),
    };
  }
};
