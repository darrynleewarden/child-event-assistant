import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, suburbName, isFavorite } = body

    // Validate required parameters
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    // Handle get-location-data action
    if (action === 'get-location-data') {
      const locationData = await prisma.locationData.findMany({
        where: {
          userId: session.user.id,
          ...(suburbName && { suburbName: { contains: suburbName, mode: 'insensitive' } }),
          ...(isFavorite !== undefined && { isFavorite }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json({
        success: true,
        locationData,
        count: locationData.length,
      })
    }

    // For other actions, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: `Action '${action}' not implemented. Use the chat assistant to save location data.`
      },
      { status: 501 }
    )

  } catch (error) {
    console.error('Location API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
