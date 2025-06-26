export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: { users: true }
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' })
    }

    // Parse playlist from JSON
    const roomWithPlaylist = {
      ...room,
      playlist: Array.isArray(room.playlist) ? room.playlist : []
    }

    return NextResponse.json({ success: true, room: roomWithPlaylist })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch room' })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const room = await prisma.room.update({
      where: { id: params.id },
      data: updates
    })
    
    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json({ success: false, error: 'Failed to update room' }, { status: 500 })
  }
}
