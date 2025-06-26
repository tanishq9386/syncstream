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
  const [loopMode, setLoopMode] = useState<'none' | 'playlist' | 'single'>('none')

  useEffect(() => {
    const newSocket = io()
    setSocket(newSocket)

    fetchRoom()

    newSocket.on('room:updated', (updatedRoom: Room) => {
      console.log('Room updated via socket:', updatedRoom)
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
      console.log('Music sync received:', data)
      setCurrentTime(data.currentTime)
      setIsPlaying(data.isPlaying)
    })

    newSocket.emit('room:join', { roomId, username })

    return () => {
      newSocket.emit('room:leave', { roomId, username })
      newSocket.disconnect()
    }
  }, [roomId, username])

  const fetchRoom = async () => {
    try {
      console.log('Fetching room data...')
      const response = await fetch(`/api/rooms/${roomId}`)
      const data = await response.json()
      
      console.log('Room data received:', data)
      
      if (data.success) {
        setRoom(data.room)
        setPlaylist(data.room.playlist)
        setIsPlaying(data.room.isPlaying)
        setCurrentTime(data.room.currentTime)
        
        if (data.room.currentSong) {
          const track = data.room.playlist.find((t: MusicTrack) => t.id === data.room.currentSong)
          setCurrentTrack(track || null)
          console.log('Current track set:', track)
        }
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRoomState = async (updates: any) => {
    try {
      console.log('Updating room state:', updates)
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Room state updated:', result)
        
        if (updates.currentSong !== undefined) {
          const track = playlist.find(t => t.id === updates.currentSong)
          setCurrentTrack(track || null)
        }
        if (updates.isPlaying !== undefined) {
          setIsPlaying(updates.isPlaying)
        }
        if (updates.currentTime !== undefined) {
          setCurrentTime(updates.currentTime)
        }
        
        if (socket) {
          socket.emit('room:update', { roomId, updates })
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating room state:', error)
      return false
    }
  }

  const handlePlayTrack = async (track: MusicTrack) => {
    console.log('Playing track:', track)
    const success = await updateRoomState({
      currentSong: track.id,
      isPlaying: true,
      currentTime: 0
    })
    
    if (!success) {
      console.error('Failed to update room state for track:', track)
    }
  }

  const handlePlayPause = async () => {
    console.log('Play/Pause clicked, current state:', isPlaying)
    const success = await updateRoomState({
      isPlaying: !isPlaying
    })
    
    if (!success) {
      console.error('Failed to update play/pause state')
    }
  }

  const toggleLoopMode = () => {
    const nextMode = loopMode === 'none' ? 'playlist' : loopMode === 'playlist' ? 'single' : 'none'
    setLoopMode(nextMode)
    console.log('Loop mode changed to:', nextMode)
  }

  const handleTrackEnded = async () => {
    console.log('Track ended, loop mode:', loopMode)
    
    if (loopMode === 'single' && currentTrack) {
      console.log('Single loop: restarting current track')
      await updateRoomState({
        currentSong: currentTrack.id,
        isPlaying: true,
        currentTime: 0
      })
      return
    }
    
    await handleNext()
  }

  const handleNext = async () => {
    console.log('Next clicked, current playlist:', playlist)
    console.log('Current track:', currentTrack)
    console.log('Loop mode:', loopMode)
    
    if (playlist.length === 0) {
      console.log('No tracks in playlist')
      return
    }

    const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id)
    console.log('Current track index:', currentIndex)
    
    let nextIndex = (currentIndex + 1) % playlist.length
    
    if (currentIndex === playlist.length - 1) {
      if (loopMode === 'playlist') {
        console.log('Playlist loop: going to start')
        nextIndex = 0
      } else if (loopMode === 'none') {
        console.log('End of playlist, stopping playback')
        await updateRoomState({ isPlaying: false })
        return
      }
    }
    
    const nextTrack = playlist[nextIndex]
    console.log('Next track:', nextTrack)
    
    if (nextTrack) {
      await handlePlayTrack(nextTrack)
    }
  }

  const handlePrevious = async () => {
    console.log('Previous clicked, current playlist:', playlist)
    console.log('Current track:', currentTrack)
    console.log('Loop mode:', loopMode)
    
    if (playlist.length === 0) {
      console.log('No tracks in playlist')
      return
    }

    const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id)
    console.log('Current track index:', currentIndex)
    
    let previousIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1
    
    if (currentIndex === 0) {
      if (loopMode === 'playlist') {
        console.log('Playlist loop: going to end')
        previousIndex = playlist.length - 1
      } else if (loopMode === 'none') {
        console.log('Start of playlist, staying at first track')
        previousIndex = 0
      }
    }
    
    const previousTrack = playlist[previousIndex]
    console.log('Previous track:', previousTrack)
    
    if (previousTrack) {
      await handlePlayTrack(previousTrack)
    }
  }

  const handleAddTrack = async (track: MusicTrack) => {
    try {
      console.log('Adding track:', track)
      const response = await fetch(`/api/rooms/${roomId}/playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track }),
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('Track added successfully')
        await fetchRoom()
        if (!currentTrack) {
          console.log('Auto-playing first track')
          await handlePlayTrack(track)
        }
        
        if (socket) {
          socket.emit('music:add', { roomId, track })
        }
      } else {
        console.error('Failed to add track:', result.error)
      }
    } catch (error) {
      console.error('Error adding track:', error)
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      console.log('Removing track:', trackId)
      const response = await fetch(`/api/rooms/${roomId}/playlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      })

      const result = await response.json()
      console.log('Remove track response:', result)

      if (response.ok && result.success) {
        console.log('Track removed successfully')
        const updatedPlaylist = playlist.filter(track => track.id !== trackId)
        setPlaylist(updatedPlaylist)
        if (currentTrack?.id === trackId) {
          console.log('Removed track was currently playing')
          
          if (updatedPlaylist.length === 0) {
            console.log('No tracks left in playlist')
            setCurrentTrack(null)
            await updateRoomState({
              currentSong: null,
              isPlaying: false,
              playlist: []
            })
          } else {
            const currentIndex = playlist.findIndex(track => track.id === trackId)
            let nextTrack = updatedPlaylist[currentIndex] || updatedPlaylist[0]
            
            console.log('Playing next track after removal:', nextTrack)
            await updateRoomState({
              currentSong: nextTrack.id,
              isPlaying: true,
              currentTime: 0,
              playlist: updatedPlaylist
            })
          }
        } else {
          await updateRoomState({
            playlist: updatedPlaylist
          })
        }
        await fetchRoom()
        if (socket) {
          socket.emit('track:removed', { roomId, trackId, updatedPlaylist })
        }
      } else {
        console.error('Failed to remove track:', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error removing track:', error)
    }
  }


  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    if (socket) {
      socket.emit('music:sync', { roomId, currentTime: time, isPlaying })
    }
  }

  const hasPreviousTrack = () => {
    if (playlist.length <= 1) return false
    const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id)
    return currentIndex > 0 || playlist.length > 1
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
              onPrevious={handlePrevious}
              onTimeUpdate={handleTimeUpdate}
              onTrackEnded={handleTrackEnded} 
              hasPreviousTrack={hasPreviousTrack()}
              loopMode={loopMode}
              onToggleLoop={toggleLoopMode}
            />
            
            <MusicSearch onAddTrack={handleAddTrack} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <RoomControls
              room={room}
              playlist={playlist}
              onRemoveTrack={handleRemoveTrack}
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
