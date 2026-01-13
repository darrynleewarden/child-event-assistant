import { NextRequest, NextResponse } from 'next/server'

// Mock API route for local development
// This simulates the AWS Lambda + Bedrock Agent response
// Replace this with actual AWS API Gateway endpoint after deployment

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, sessionId, currentDate, currentTime } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Enhance message with current date/time context (Option A)
    const enhancedMessage = currentDate && currentTime
      ? `[System: Today is ${currentDate}, current time is ${currentTime}] ${message}`
      : message

    console.log('Enhanced message with context:', enhancedMessage)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock response - simulating Bedrock Agent
    const mockResponse = generateMockResponse(enhancedMessage)

    return NextResponse.json({
      message: mockResponse,
      sessionId: sessionId || `mock-session-${Date.now()}`,
    })
  } catch (error) {
    console.error('Bedrock API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function generateMockResponse(message: string): string {
  const lowercaseMessage = message.toLowerCase()

  // Simple keyword-based responses for testing
  if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi')) {
    return "Hello! I'm your Child Event Assistant. I'm here to help you manage child events and activities. How can I assist you today?"
  }

  if (lowercaseMessage.includes('help')) {
    return `I can help you with:
• Event planning and scheduling
• Activity suggestions for different age groups
• Safety considerations and guidelines
• Parent communication and updates

What would you like to know more about?`
  }

  if (lowercaseMessage.includes('activity') || lowercaseMessage.includes('activities')) {
    return `Great question about activities! I can suggest age-appropriate activities for children. Could you tell me:
• What age group are you planning for?
• What type of activity are you interested in (indoor, outdoor, educational, creative)?`
  }

  if (lowercaseMessage.includes('event')) {
    return `I'd be happy to help with event planning! For a child event, I can assist with:
• Choosing age-appropriate themes
• Planning activities and games
• Safety considerations
• Timing and scheduling

What kind of event are you planning?`
  }

  // Default response
  return `Thank you for your message! I'm a mock AI assistant for child event management.

Your message: "${message}"

Note: This is a development mock. Once you deploy the AWS infrastructure with Terraform, this will be replaced with the actual Claude 3.5 Sonnet Bedrock Agent.

How else can I help you with child event planning?`
}
