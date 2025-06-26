export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name, username } = await request.json()

    if (!name || !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Generate unique room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Don't use upsert - just create the user directly since username is not unique
    const user = await prisma.user.create({
      data: { username }
    })

    // Create room
    const room = await prisma.room.create({
      data: {
        name,
        code,
        hostId: user.id,
        users: {
          connect: { id: user.id }
        }
      },
      include: {
        users: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      room 
    })
  } catch (error) {
    console.error('Error creating room:', error)

    if (error instanceof Error) {
      // Handle Prisma unique constraint error (room code collision)
      if ((error as any).code === 'P2002') {
        return NextResponse.json({ 
          success: false, 
          error: 'Room code collision. Please try again.' 
        }, { status: 409 })
      }

      // Handle foreign key constraint error
      if ((error as any).code === 'P2003') {
        return NextResponse.json({ 
          success: false, 
          error: 'Database constraint error' 
        }, { status: 400 })
      }

      // Handle other database errors
      if ((error as any).code && (error as any).code.startsWith('P')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database operation failed' 
        }, { status: 500 })
      }

      // Handle other known errors
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create room' 
      }, { status: 500 })
    }

    // Handle non-Error objects
    return NextResponse.json({ 
      success: false, 
      error: 'An unknown error occurred' 
    }, { status: 500 })
  }
}
