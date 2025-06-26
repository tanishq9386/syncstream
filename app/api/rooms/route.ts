import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name, username } = await request.json()

    if (!name || !username) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Generate unique room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Use upsert to handle existing users gracefully
    const user = await prisma.user.upsert({
      where: { username }, // This assumes username should be unique
      update: {}, // Don't update anything if user exists
      create: { username }
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

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create room',
      details: error.message // Add this for debugging
    }, { status: 500 })
  }
}
