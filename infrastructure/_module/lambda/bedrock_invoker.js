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

// Determine which agent to use based on message content
const determineAgent = (message) => {
  const lowercaseMessage = message.toLowerCase();

  // Check for location keywords
  if (lowercaseMessage.includes('location') ||
    lowercaseMessage.includes('real estate') ||
    lowercaseMessage.includes('suburb')) {
    return {
      agentId: process.env.LOCATION_AGENT_ID,
      agentAliasId: process.env.LOCATION_AGENT_ALIAS_ID,
      agentType: 'location'
    };
  }

  // Check for meal planning keywords
  if (lowercaseMessage.includes('meal') ||
    lowercaseMessage.includes('recipe') ||
    lowercaseMessage.includes('menu')) {
    return {
      agentId: process.env.MEAL_AGENT_ID,
      agentAliasId: process.env.MEAL_AGENT_ALIAS_ID,
      agentType: 'meal'
    };
  }

  // Check for reporting keywords
  if (lowercaseMessage.includes('report') ||
    lowercaseMessage.includes('export') ||
    lowercaseMessage.includes('excel') ||
    lowercaseMessage.includes('csv') ||
    lowercaseMessage.includes('pdf') ||
    lowercaseMessage.includes('generate')) {
    return {
      agentId: process.env.REPORTING_AGENT_ID,
      agentAliasId: process.env.REPORTING_AGENT_ALIAS_ID,
      agentType: 'reporting'
    };
  }

  // Default to main agent
  return {
    agentId: process.env.AGENT_ID,
    agentAliasId: process.env.AGENT_ALIAS_ID,
    agentType: 'main'
  };
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

    // Determine which agent to route to
    const agent = determineAgent(message);
    console.log(`Routing to ${agent.agentType} agent`);

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

    // Build session attributes so the Lambda always has userId/userEmail
    // even if the agent LLM forgets to pass them as action parameters
    const sessionAttributes = {};
    if (userId) sessionAttributes.userId = userId;
    if (userEmail) sessionAttributes.userEmail = userEmail;
    if (userName) sessionAttributes.userName = userName;

    // Invoke Bedrock Agent with session context
    const command = new InvokeAgentCommand({
      agentId: agent.agentId,
      agentAliasId: agent.agentAliasId,
      sessionId: sessionId,
      inputText: inputText,
      enableTrace: false,
      sessionState: {
        sessionAttributes: sessionAttributes,
      },
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
        agentType: agent.agentType, // Return which agent handled the request
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
