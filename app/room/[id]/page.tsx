'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import MusicPlayer from '@/components/MusicPlayer'
import MusicSearch from '@/components/MusicSearch'
import RoomControls from '@/components/RoomControls'
import { Room, MusicTrack, User } from '@/types'

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id as string
  const username = searchParams.get('username') || 'Anonymous'

  const [socket, setSocket] = useState<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [playlist, setPlaylist] = useState<MusicTrack[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const newSocket = io()
    setSocket(newSocket)

    // Fetch room data
    fetchRoom()

    // Socket event listeners
    newSocket.on('room:updated', (updatedRoom: Room) => {
      setRoom(updatedRoom)
      setPlaylist(updatedRoom.playlist)
      setIsPlaying(updatedRoom.isPlaying)
      setCurrentTime(updatedRoom.currentTime)
      
      if (updatedRoom.currentSong) {
        const track = updatedRoom.playlist.find(t => t.id === updatedRoom.currentSong)
        setCurrentTrack(track || null)
      }
    })

    newSocket.on('music:sync', (data: { currentTime: number; isPlaying: boolean }) => {
      setCurrentTime(data.currentTime)
      setIsPlaying(data.isPlaying)
    })

    // Join room
    newSocket.emit('room:join', { roomId, username })

    return () => {
      newSocket.emit('room:leave', { roomId, username })
      newSocket.disconnect()
    }
  }, [roomId, username])

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      const data = await response.json()
      
      if (data.success) {
        setRoom(data.room)
        setPlaylist(data.room.playlist)
        setIsPlaying(data.room.isPlaying)
        setCurrentTime(data.room.currentTime)
        
        if (data.room.currentSong) {
          const track = data.room.playlist.find((t: MusicTrack) => t.id === data.room.currentSong)
          setCurrentTrack(track || null)
        }
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayPause = () => {
    if (socket) {
      socket.emit(isPlaying ? 'music:pause' : 'music:play', { roomId })
    }
  }

  const handleNext = () => {
    if (socket) {
      socket.emit('music:next', { roomId })
    }
  }

  const handleAddTrack = (track: MusicTrack) => {
    if (socket) {
      socket.emit('music:add', { roomId, track })
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/playlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      })
    } catch (error) {
      console.error('Error removing track:', error)
    }
  }

  const handleTimeUpdate = (time: number) => {
    if (socket) {
      socket.emit('music:sync', { roomId, currentTime: time, isPlaying })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading room...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Room not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <MusicPlayer
              currentTrack={currentTrack || undefined}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onTimeUpdate={handleTimeUpdate}
            />
            
            <MusicSearch onAddTrack={handleAddTrack} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <RoomControls
              room={room}
              playlist={playlist}
              onRemoveTrack={handleRemoveTrack}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
