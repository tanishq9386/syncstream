'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import SocketManager from '@/lib/socket'
import type { Socket } from 'socket.io-client'
import MusicPlayer from 'components/MusicPlayer'
import MusicSearch from 'components/MusicSearch'
import RoomControls from 'components/RoomControls'
import { Room, MusicTrack, User } from 'types'

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
  const [connectedUsers, setConnectedUsers] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Refs for cross-tab synchronization
  const broadcastChannel = useRef<BroadcastChannel | null>(null)
  const isMainTab = useRef(false)
  const tabId = useRef(Date.now() + Math.random())
  const socketManager = useRef<SocketManager | null>(null)

  useEffect(() => {
    // Initialize broadcast channel for cross-tab sync
    broadcastChannel.current = new BroadcastChannel(`syncstream-room-${roomId}`)
    
    // Set up tab management
    const checkMainTab = () => {
      const lastActiveTab = localStorage.getItem(`syncstream-main-tab-${roomId}`)
      const now = Date.now()
      
      if (!lastActiveTab || now - parseInt(lastActiveTab) > 5000) {
        isMainTab.current = true
        localStorage.setItem(`syncstream-main-tab-${roomId}`, now.toString())
      }
    }
    
    checkMainTab()
    const tabInterval = setInterval(checkMainTab, 2000)

    // Initialize Socket.IO connection using SocketManager
    const initializeSocket = async () => {
      try {
        socketManager.current = SocketManager.getInstance()
        const newSocket = await socketManager.current.connect()
        setSocket(newSocket)

        // Connection status handlers
        newSocket.on('connect', () => {
          console.log('Connected to server:', newSocket.id)
          setConnectionStatus('connected')
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server')
          setConnectionStatus('disconnected')
        })

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error)
          setConnectionStatus('disconnected')
        })

        // Set up event listeners using SocketManager methods
        socketManager.current.onRoomUpdated((data: any) => {
          console.log('Room updated via socket:', data)
          
          if (data.room) {
            setRoom(data.room)
            setPlaylist(data.room.playlist || [])
            setIsPlaying(data.room.isPlaying || false)
            setCurrentTime(data.room.currentTime || 0)
            
            if (data.room.currentSong) {
              const track = data.room.playlist?.find((t: MusicTrack) => t.id === data.room.currentSong)
              setCurrentTrack(track || null)
            }
          } else {
            // Handle direct updates
            if (data.playlist !== undefined) setPlaylist(data.playlist)
            if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying)
            if (data.currentTime !== undefined) setCurrentTime(data.currentTime)
            if (data.currentSong !== undefined) {
              const track = playlist.find(t => t.id === data.currentSong)
              setCurrentTrack(track || null)
            }
          }

          // Broadcast to other tabs
          broadcastToOtherTabs('ROOM_UPDATE', data)
        })

        socketManager.current.onMusicSync((data: { 
          action?: string;
          currentTime?: number; 
          isPlaying?: boolean; 
          trackId?: string; 
          timestamp?: number 
        }) => {
          console.log('Music sync received:', data);
          console.log('Current tab isMainTab:', isMainTab.current);
          
          // Always update state for ALL tabs, not just main tab
          switch (data.action) {
            case "play":
              console.log('Received PLAY command');
              if (data.trackId) {
                const track = playlist.find(t => t.id === data.trackId);
                if (track) {
                  console.log('Setting track:', track.title);
                  setCurrentTrack(track);
                }
              }
              if (data.currentTime !== undefined) setCurrentTime(data.currentTime);
              setIsPlaying(true);
              break;
              
            case "pause":
              console.log('Received PAUSE command');
              if (data.currentTime !== undefined) setCurrentTime(data.currentTime);
              setIsPlaying(false);
              break;
              
            case "trackChange":
              console.log('Received TRACK CHANGE command');
              if (data.trackId) {
                const track = playlist.find(t => t.id === data.trackId);
                if (track) {
                  console.log('Changing to track:', track.title);
                  setCurrentTrack(track);
                  setCurrentTime(0);
                  setIsPlaying(data.isPlaying || false);
                }
              }
              break;
              
            default:
              // Fallback for legacy sync messages
              console.log('Received legacy sync');
              if (data.currentTime !== undefined) setCurrentTime(data.currentTime);
              if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
              if (data.trackId) {
                const track = playlist.find(t => t.id === data.trackId);
                if (track) setCurrentTrack(track);
              }
          }

          // Broadcast to other tabs
          broadcastToOtherTabs('MUSIC_SYNC', data);
        });

        newSocket.on('music:next', () => {
          console.log('Next track signal received')
          handleNext()
        })

        socketManager.current.onPlaylistUpdated((data: { action: string; track?: MusicTrack; trackId?: string }) => {
          console.log('Playlist updated:', data)
          
          if (data.action === 'add' && data.track) {
            setPlaylist(prev => [...prev, data.track!])
          } else if (data.action === 'remove' && data.trackId) {
            setPlaylist(prev => prev.filter(t => t.id !== data.trackId))
          }
          
          fetchRoom()
        })

        socketManager.current.onRoomUsers((users: string[]) => {
          console.log('Room users updated:', users)
          setConnectedUsers(users)
        })

        socketManager.current.onUserJoined(({ username: joinedUser }: { username: string }) => {
          console.log('User joined:', joinedUser)
          setConnectedUsers(prev => [...prev.filter(u => u !== joinedUser), joinedUser])
        })

        socketManager.current.onUserLeft(({ username: leftUser }: { username: string }) => {
          console.log('User left:', leftUser)
          setConnectedUsers(prev => prev.filter(u => u !== leftUser))
        })

        // Join room using SocketManager
        socketManager.current.joinRoom(roomId, username)

      } catch (error) {
        console.error('Failed to connect socket:', error)
        setConnectionStatus('disconnected')
      }
    }

    // Cross-tab message handling
    broadcastChannel.current.onmessage = (event) => {
      const { type, data, senderId } = event.data
      
      // Ignore messages from this tab
      if (senderId === tabId.current) return
      
      switch (type) {
        case 'ROOM_UPDATE':
          if (data.room) {
            setRoom(data.room)
            setPlaylist(data.room.playlist || [])
          }
          break
        case 'MUSIC_SYNC':
          if (data.currentTime !== undefined) setCurrentTime(data.currentTime)
          if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying)
          break
        case 'USER_UPDATE':
          setConnectedUsers(data.users || [])
          break
      }
    }

    // Fetch initial room data
    fetchRoom()
    
    // Initialize socket connection
    initializeSocket()

    return () => {
      clearInterval(tabInterval)
      
      // Clean up using SocketManager
      if (socketManager.current) {
        socketManager.current.leaveRoom(roomId, username)
        // Don't disconnect here as other tabs might be using the socket
      }
      
      broadcastChannel.current?.close()
    }
  }, [roomId, username])

  const broadcastToOtherTabs = (type: string, data: any) => {
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({
        type,
        data,
        senderId: tabId.current,
        timestamp: Date.now()
      })
    }
  }

  const fetchRoom = async () => {
    try {
      console.log('Fetching room data...')
      const response = await fetch(`/api/rooms/${roomId}`)
      const data = await response.json()
      
      console.log('Room data received:', data)
      
      if (data.success) {
        setRoom(data.room)
        setPlaylist(data.room.playlist || [])
        setIsPlaying(data.room.isPlaying || false)
        setCurrentTime(data.room.currentTime || 0)
        
        if (data.room.currentSong) {
          const track = data.room.playlist?.find((t: MusicTrack) => t.id === data.room.currentSong)
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
        
        // Update local state immediately
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
        
        // Emit socket event for real-time sync using SocketManager
        if (socketManager.current && isMainTab.current) {
          socketManager.current.updateRoom(roomId, updates)
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
    console.log('Playing track:', track);
    
    // Update local state immediately
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    
    const success = await updateRoomState({
      currentSong: track.id,
      isPlaying: true,
      currentTime: 0
    });
    
    if (success && socketManager.current) {
      // Emit to ALL clients
      if (socketManager.current.getSocket()) {
        socketManager.current.getSocket()?.emit('track:change', {
          roomId,
          trackId: track.id,
          autoPlay: true
        });
      }
    }
    
    if (!success) {
      console.error('Failed to update room state for track:', track);
    }
  };


  const handlePlayPause = async () => {
    console.log('Play/Pause clicked, current state:', isPlaying);
    const newPlayingState = !isPlaying;
    
    setIsPlaying(newPlayingState);
    
    const success = await updateRoomState({
      isPlaying: newPlayingState,
      currentTime: currentTime
    });
    
    if (success && socketManager.current) {
      // Emit to ALL clients (remove isMainTab check)
      if (socketManager.current.getSocket()) {
        if (newPlayingState) {
          socketManager.current.getSocket()?.emit('music:play', { 
            roomId, 
            trackId: currentTrack?.id, 
            currentTime 
          });
        } else {
          socketManager.current.getSocket()?.emit('music:pause', { 
            roomId, 
            currentTime 
          });
        }
      }
    }
    
    if (!success) {
      console.error('Failed to update play/pause state');
      // Revert local state if API call failed
      setIsPlaying(!newPlayingState);
    }
  };

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
        
        if (socketManager.current && isMainTab.current) {
          socketManager.current.addTrack(roomId, track)
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
        
        if (socketManager.current && isMainTab.current) {
          socketManager.current.removeTrack(roomId, trackId)
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
    if (socketManager.current && isMainTab.current) {
      socketManager.current.syncMusic(roomId, time, isPlaying)
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
        {/* Connection Status */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-green-500/20 text-green-400' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-green-400 animate-pulse' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-red-400'
            }`}></div>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        </div>

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
              connectedUsers={connectedUsers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
