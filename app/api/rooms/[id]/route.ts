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
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    const roomWithPlaylist = {
      ...room,
      playlist: Array.isArray(room.playlist) ? room.playlist : []
    }

    return NextResponse.json({ success: true, room: roomWithPlaylist })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch room' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const validUpdates: any = {}
    
    if (updates.name !== undefined) validUpdates.name = updates.name
    if (updates.currentSong !== undefined) validUpdates.currentSong = updates.currentSong
    if (updates.isPlaying !== undefined) validUpdates.isPlaying = Boolean(updates.isPlaying)
    if (updates.currentTime !== undefined) validUpdates.currentTime = Number(updates.currentTime)
    if (updates.playlist !== undefined) {
      validUpdates.playlist = Array.isArray(updates.playlist) ? updates.playlist : []
    }
    
    const room = await prisma.$transaction(async (tx) => {
      const existingRoom = await tx.room.findUnique({
        where: { id: params.id },
        include: { users: true }
      })
      
      if (!existingRoom) {
        throw new Error('Room not found')
      }
      
      const updatedRoom = await tx.room.update({
        where: { id: params.id },
        data: {
          ...validUpdates,
          updatedAt: new Date() 
        },
        include: { users: true }
      })
      
      return updatedRoom
    })
    
    const roomWithPlaylist = {
      ...room,
      playlist: Array.isArray(room.playlist) ? room.playlist : []
    }
    
    return NextResponse.json({ success: true, room: roomWithPlaylist })
  } catch (error) {
    console.error('Error updating room:', error)
    if (error instanceof Error) {
    // Handle specific error types
    if (error.message === 'Room not found') {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    
    // Handle Prisma-specific errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Constraint violation' }, { status: 400 })
    }
    
    if ((error as any).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }
  }
    return NextResponse.json({ success: false, error: 'Failed to update room' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const existingRoom = await tx.room.findUnique({
        where: { id: params.id }
      })
      
      if (!existingRoom) {
        throw new Error('Room not found')
      }
      
      await tx.user.deleteMany({
        where: { roomId: params.id }
      })
      
      await tx.room.delete({
        where: { id: params.id }
      })
    })
    
    return NextResponse.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Error deleting room:', error)
    if (error instanceof Error) {
    if (error.message === 'Room not found') {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
  }
    return NextResponse.json({ success: false, error: 'Failed to delete room' }, { status: 500 })
  }
}
