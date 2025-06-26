import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { trackId } = await request.json()

    const room = await prisma.room.findUnique({
      where: { id: params.id }
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' })
    }

    const playlist = Array.isArray(room.playlist) ? room.playlist : []
    const updatedPlaylist = playlist.filter((track: any) => track.id !== trackId)

    await prisma.room.update({
      where: { id: params.id },
      data: { playlist: updatedPlaylist }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing track:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove track' })
  }
}
