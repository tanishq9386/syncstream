export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code, username } = await request.json()

    if (!code || !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Find room by code
    const room = await prisma.room.findUnique({
      where: { code },
      include: { users: true }
    })

    if (!room) {
      return NextResponse.json({ 
        success: false, 
        error: 'Room not found' 
      }, { status: 404 })
    }

    // Create user and add to room
    const user = await prisma.user.create({
      data: {
        username,
        roomId: room.id
      }
    })

    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: { users: true }
    })

    return NextResponse.json({ 
      success: true, 
      room: updatedRoom 
    })
  } catch (error) {
    console.error('Error joining room:', error)

    if (error instanceof Error) {
      // Handle Prisma unique constraint error (username already exists in room)
      if ((error as any).code === 'P2002') {
        return NextResponse.json({ 
          success: false, 
          error: 'Username already taken in this room' 
        }, { status: 409 })
      }

      // Handle other known errors
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to join room' 
      }, { status: 500 })
    }

    // Handle non-Error objects
    return NextResponse.json({ 
      success: false, 
      error: 'An unknown error occurred' 
    }, { status: 500 })
  }
}
