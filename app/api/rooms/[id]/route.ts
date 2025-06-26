import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
