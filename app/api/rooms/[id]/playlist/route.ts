import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { track } = await request.json()

    const room = await prisma.room.findUnique({
      where: { id: params.id }
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' })
    }

    const playlist = Array.isArray(room.playlist) ? room.playlist : []
    
    // Check if track already exists
    const trackExists = playlist.some((t: any) => t.id === track.id)
    if (trackExists) {
      return NextResponse.json({ success: false, error: 'Track already in playlist' })
    }

    // Add track to playlist
    const updatedPlaylist = [...playlist, track]

    await prisma.room.update({
      where: { id: params.id },
      data: { playlist: updatedPlaylist }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding track:', error)
    return NextResponse.json({ success: false, error: 'Failed to add track' })
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const { trackId } = await request.json()
      console.log('API: Removing track', trackId, 'from room', params.id)

      const room = await prisma.room.findUnique({
        where: { id: params.id }
      })

      if (!room) {
        console.log('API: Room not found')
        return NextResponse.json({ success: false, error: 'Room not found' })
      }

      const playlist = Array.isArray(room.playlist) ? room.playlist : []
      console.log('API: Current playlist:', playlist.length, 'tracks')
      
      const updatedPlaylist = playlist.filter((track: any) => track.id !== trackId)
      console.log('API: Updated playlist:', updatedPlaylist.length, 'tracks')

      await prisma.room.update({
        where: { id: params.id },
        data: { playlist: updatedPlaylist }
      })

      console.log('API: Track removed successfully')
      return NextResponse.json({ success: true, playlist: updatedPlaylist })
    } catch (error) {
      console.error('API: Error removing track:', error)
      return NextResponse.json({ success: false, error: 'Failed to remove track' }, { status: 500 })
    }
  }
