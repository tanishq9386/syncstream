import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code, username } = await request.json()

    if (!code || !username) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    // Find room by code
    const room = await prisma.room.findUnique({
      where: { code },
      include: { users: true }
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' })
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

    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (error) {
    console.error('Error joining room:', error)
    return NextResponse.json({ success: false, error: 'Failed to join room' })
  }
}
