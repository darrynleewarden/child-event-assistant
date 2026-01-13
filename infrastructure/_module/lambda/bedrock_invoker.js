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
    const { message, sessionId: providedSessionId, userId, userEmail, userName, currentDate, currentTime } = body;

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

    // Build system context with date/time and user information
    const systemContextParts = ['[SYSTEM CONTEXT]'];

    // Add date/time context (Option A implementation)
    if (currentDate && currentTime) {
      systemContextParts.push(`Current Date: ${currentDate}`);
      systemContextParts.push(`Current Time: ${currentTime}`);
      systemContextParts.push('Note: When user mentions relative dates like "tomorrow", "next week", etc., calculate based on the current date above.');
    }

    // Add user context
    if (userId) {
      systemContextParts.push(`User ID: ${userId}`);
      if (userEmail) systemContextParts.push(`Email: ${userEmail}`);
      if (userName) systemContextParts.push(`Name: ${userName}`);
    }

    systemContextParts.push('[END SYSTEM CONTEXT]');
    systemContextParts.push('');
    systemContextParts.push(`User message: ${message}`);

    inputText = systemContextParts.join('\n');

    console.log('Enhanced input text:', inputText);

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
