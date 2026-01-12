interface BedrockRequest {
  message: string
  sessionId?: string
}

interface BedrockResponse {
  message: string
  sessionId: string
}

interface BedrockError {
  error: string
  details?: string
}

export async function invokeBedrockAgent(
  message: string,
  sessionId?: string
): Promise<BedrockResponse> {
  const apiEndpoint = process.env.NEXT_PUBLIC_BEDROCK_API_URL

  if (!apiEndpoint) {
    throw new Error('NEXT_PUBLIC_BEDROCK_API_URL is not configured')
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
    } as BedrockRequest),
  })

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorData = (await response.json()) as BedrockError
      if (errorData.error) {
        errorMessage = errorData.error
      }
    } catch {
      // Response body wasn't valid JSON, use default error message
    }
    throw new Error(errorMessage)
  }

  const data = (await response.json()) as BedrockResponse
  return data
}
