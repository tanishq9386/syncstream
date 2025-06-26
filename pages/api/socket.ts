import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'
import { NextApiResponseServerIO } from '@/lib/socket'
import { prisma } from '@/lib/prisma'

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...')
    
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('room:join', async ({ roomId, username }) => {
        socket.join(roomId)
        console.log(`${username} joined room ${roomId}`)
      })

      socket.on('room:leave', ({ roomId, username }) => {
        socket.leave(roomId)
        console.log(`${username} left room ${roomId}`)
      })

      socket.on('music:play', async ({ roomId }) => {
        await prisma.room.update({
          where: { id: roomId },
          data: { isPlaying: true }
        })
        
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { users: true }
        })
        
        io.to(roomId).emit('room:updated', {
          ...room,
          playlist: Array.isArray(room?.playlist) ? room.playlist : []
        })
      })

      socket.on('music:pause', async ({ roomId }) => {
        await prisma.room.update({
          where: { id: roomId },
          data: { isPlaying: false }
        })
        
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { users: true }
        })
        
        io.to(roomId).emit('room:updated', {
          ...room,
          playlist: Array.isArray(room?.playlist) ? room.playlist : []
        })
      })

      socket.on('music:next', async ({ roomId }) => {
        const room = await prisma.room.findUnique({
          where: { id: roomId }
        })
        
        if (room) {
          const playlist = Array.isArray(room.playlist) ? room.playlist : []
          const currentIndex = playlist.findIndex((track: any) => track.id === room.currentSong)
          const nextIndex = (currentIndex + 1) % playlist.length
          const nextTrack = playlist[nextIndex]
          
          await prisma.room.update({
            where: { id: roomId },
            data: {
              currentSong: nextTrack?.id || null,
              currentTime: 0
            }
          })
          
          const updatedRoom = await prisma.room.findUnique({
            where: { id: roomId },
            include: { users: true }
          })
          
          io.to(roomId).emit('room:updated', {
            ...updatedRoom,
            playlist: Array.isArray(updatedRoom?.playlist) ? updatedRoom.playlist : []
          })
        }
      })

      socket.on('music:add', async ({ roomId, track }) => {
        const room = await prisma.room.findUnique({
          where: { id: roomId }
        })
        
        if (room) {
          const playlist = Array.isArray(room.playlist) ? room.playlist : []
          const updatedPlaylist = [...playlist, track]
          
          const updateData: any = { playlist: updatedPlaylist }
          
          if (!room.currentSong && updatedPlaylist.length === 1) {
            updateData.currentSong = track.id
          }
          
          await prisma.room.update({
            where: { id: roomId },
            data: updateData
          })
          
          const updatedRoom = await prisma.room.findUnique({
            where: { id: roomId },
            include: { users: true }
          })
          
          io.to(roomId).emit('room:updated', {
            ...updatedRoom,
            playlist: Array.isArray(updatedRoom?.playlist) ? updatedRoom.playlist : []
          })
        }
      })

      socket.on('music:sync', async ({ roomId, currentTime, isPlaying }) => {
        await prisma.room.update({
          where: { id: roomId },
          data: { currentTime, isPlaying }
        })
        
        socket.to(roomId).emit('music:sync', { currentTime, isPlaying })
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
