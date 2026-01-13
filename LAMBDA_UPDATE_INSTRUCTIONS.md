# Lambda Function Update Instructions

## Problem
The Bedrock AI agent defaults to 2024 dates because it doesn't know the current date when users say "tomorrow".

## Solution
Prepend the current date and time to every user message before sending to Bedrock.

## Frontend Changes (✅ COMPLETED)
The frontend now sends `currentDate` and `currentTime` with every chat message:
```typescript
{
  "message": "Book swimming tomorrow",
  "sessionId": "...",
  "userId": "...",
  "currentDate": "2026-01-14",  // ← NEW
  "currentTime": "14:30:00"      // ← NEW
}
```

## Lambda Function Update Required

Update your AWS Lambda function that invokes the Bedrock agent:

### Python Example:

```python
import json
import boto3

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

def lambda_handler(event, context):
    try:
        # Parse request body
        body = json.loads(event['body'])
        user_message = body.get('message')
        session_id = body.get('sessionId')
        current_date = body.get('currentDate')  # e.g., "2026-01-14"
        current_time = body.get('currentTime')  # e.g., "14:30:00"

        # OPTION A: Enhance message with date/time context
        enhanced_message = user_message
        if current_date and current_time:
            enhanced_message = f"[System: Today is {current_date}, current time is {current_time}] {user_message}"

        print(f"Enhanced message: {enhanced_message}")

        # Invoke Bedrock Agent with enhanced message
        response = bedrock_agent_runtime.invoke_agent(
            agentId='YOUR_AGENT_ID',
            agentAliasId='YOUR_AGENT_ALIAS_ID',
            sessionId=session_id or f"session-{context.request_id}",
            inputText=enhanced_message  # ← Use enhanced message here
        )

        # Process response...
        completion = ""
        for event in response.get('completion'):
            chunk = event.get('chunk')
            if chunk:
                completion += chunk.get('bytes').decode()

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': completion,
                'sessionId': session_id
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### Node.js Example:

```javascript
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const userMessage = body.message;
        const sessionId = body.sessionId;
        const currentDate = body.currentDate;  // e.g., "2026-01-14"
        const currentTime = body.currentTime;  // e.g., "14:30:00"

        // OPTION A: Enhance message with date/time context
        let enhancedMessage = userMessage;
        if (currentDate && currentTime) {
            enhancedMessage = `[System: Today is ${currentDate}, current time is ${currentTime}] ${userMessage}`;
        }

        console.log('Enhanced message:', enhancedMessage);

        // Invoke Bedrock Agent
        const client = new BedrockAgentRuntimeClient({ region: 'us-east-1' });
        const command = new InvokeAgentCommand({
            agentId: process.env.AGENT_ID,
            agentAliasId: process.env.AGENT_ALIAS_ID,
            sessionId: sessionId || `session-${Date.now()}`,
            inputText: enhancedMessage  // ← Use enhanced message here
        });

        const response = await client.send(command);

        // Process response...
        let completion = '';
        for await (const chunk of response.completion) {
            if (chunk.chunk && chunk.chunk.bytes) {
                completion += new TextDecoder().decode(chunk.chunk.bytes);
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: completion,
                sessionId: sessionId
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

## Testing

After updating your Lambda function:

1. Deploy the Lambda function
2. Test by saying "Book swimming tomorrow" in the chat
3. The AI should now correctly interpret "tomorrow" as 2026-01-15 (instead of 2024)
4. Check the Lambda logs to see the enhanced message:
   ```
   [System: Today is 2026-01-14, current time is 14:30:00] Book swimming tomorrow
   ```

## Key Points

- The date context is prepended to EVERY message
- Format: `[System: Today is YYYY-MM-DD, current time is HH:MM:SS] {user message}`
- This ensures the AI always knows the current date/time
- Works with relative dates: "tomorrow", "next week", "in 3 days", etc.

## Alternative: Bedrock Agent Instructions

If you prefer, you can also add this to your Bedrock Agent's instructions:
```
When a user mentions relative dates like "tomorrow", "next week", etc.,
always reference the date provided in [System: Today is YYYY-MM-DD, current time is HH:MM:SS]
at the beginning of the message.
```
