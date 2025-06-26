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
      select: { playlist: true }
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    const playlist = Array.isArray(room.playlist) ? room.playlist : []
    return NextResponse.json({ success: true, playlist })
  } catch (error) {
    console.error('Error fetching playlist:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch playlist' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { track } = await request.json()
    
    if (!track || !track.id || !track.title || !track.artist) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid track data. Required fields: id, title, artist' 
      }, { status: 400 })
    }

    console.log('API: Adding track', track.id, 'to room', params.id)

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: params.id }
      })

      if (!room) {
        throw new Error('Room not found')
      }

      const playlist = Array.isArray(room.playlist) ? room.playlist : []
      
      const trackExists = playlist.some((t: any) => t.id === track.id)
      if (trackExists) {
        throw new Error('Track already in playlist')
      }

      const trackWithMetadata = {
        ...track,
        addedAt: new Date().toISOString(),
        addedBy: 'user' 
      }
      
      const updatedPlaylist = [...playlist, trackWithMetadata]

      const updatedRoom = await tx.room.update({
        where: { id: params.id },
        data: { 
          playlist: updatedPlaylist,
          updatedAt: new Date()
        }
      })

      return { room: updatedRoom, playlist: updatedPlaylist }
    })

    console.log('API: Track added successfully')
    return NextResponse.json({ 
      success: true, 
      playlist: result.playlist,
      message: 'Track added to playlist'
    })
  } catch (error) {
    console.error('API: Error adding track:', error)
    if (error instanceof Error) {
      if (error.message === 'Room not found') {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      
      if (error.message === 'Track already in playlist') {
        return NextResponse.json({ success: false, error: 'Track already in playlist' }, { status: 409 })
      }
      
      return NextResponse.json({ success: false, error: 'Failed to add track' }, { status: 500 })
    }
    return NextResponse.json({ 
      success: false, 
      error: 'An unknown error occurred' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { trackId } = await request.json()
    
    if (!trackId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Track ID is required' 
      }, { status: 400 })
    }
    
    console.log('API: Removing track', trackId, 'from room', params.id)

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: params.id }
      })

      if (!room) {
        throw new Error('Room not found')
      }

      const playlist = Array.isArray(room.playlist) ? room.playlist : []
      console.log('API: Current playlist:', playlist.length, 'tracks')
      
      const trackExists = playlist.some((track: any) => track.id === trackId)
      if (!trackExists) {
        throw new Error('Track not found in playlist')
      }
      
      const updatedPlaylist = playlist.filter((track: any) => track.id !== trackId)
      console.log('API: Updated playlist:', updatedPlaylist.length, 'tracks')

      const updatedRoom = await tx.room.update({
        where: { id: params.id },
        data: { 
          playlist: updatedPlaylist,
          updatedAt: new Date()
        }
      })

      let additionalUpdates = {}
      if (room.currentSong === trackId) {
        console.log('API: Removed track was currently playing')
        
        if (updatedPlaylist.length === 0) {
          additionalUpdates = {
            currentSong: null,
            isPlaying: false,
            currentTime: 0
          }
        } else {
          const currentIndex = playlist.findIndex((track: any) => track.id === trackId)
          const nextTrack = updatedPlaylist[currentIndex] || updatedPlaylist[0]
          if (nextTrack) {
            additionalUpdates = {
              currentSong: (nextTrack as any).id,
              currentTime: 0
            }
          }
        }
        
        if (Object.keys(additionalUpdates).length > 0) {
          await tx.room.update({
            where: { id: params.id },
            data: additionalUpdates
          })
        }
      }

      return { 
        playlist: updatedPlaylist, 
        currentSongRemoved: room.currentSong === trackId,
        additionalUpdates
      }
    })

    console.log('API: Track removed successfully')
    return NextResponse.json({ 
      success: true, 
      playlist: result.playlist,
      currentSongRemoved: result.currentSongRemoved,
      additionalUpdates: result.additionalUpdates,
      message: 'Track removed from playlist'
    })
  } catch (error) {
    console.error('API: Error removing track:', error)
    if (error instanceof Error) {
      if (error.message === 'Room not found') {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      
      if (error.message === 'Track not found in playlist') {
        return NextResponse.json({ success: false, error: 'Track not found in playlist' }, { status: 404 })
      }
      
      return NextResponse.json({ success: false, error: 'Failed to remove track' }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { playlist } = await request.json()
    
    if (!Array.isArray(playlist)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Playlist must be an array' 
      }, { status: 400 })
    }

    console.log('API: Updating entire playlist for room', params.id)

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: params.id }
      })

      if (!room) {
        throw new Error('Room not found')
      }

      const updatedRoom = await tx.room.update({
        where: { id: params.id },
        data: { 
          playlist,
          updatedAt: new Date()
        }
      })

      return updatedRoom
    })

    console.log('API: Playlist updated successfully')
    return NextResponse.json({ 
      success: true, 
      playlist,
      message: 'Playlist updated successfully'
    })
  } catch (error) {
    console.error('API: Error updating playlist:', error)
    if (error instanceof Error) {
      if (error.message === 'Room not found') {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      
      return NextResponse.json({ success: false, error: 'Failed to update playlist' }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
