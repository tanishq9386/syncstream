'use client'

import { useState } from 'react'
import { Copy, Users, Music, Wifi, WifiOff, Crown } from 'lucide-react'
import { Room, MusicTrack } from 'types'

interface RoomControlsProps {
  room: Room
  playlist: MusicTrack[]
  onRemoveTrack: (trackId: string) => void
  onPlayTrack: (track: MusicTrack) => void
  currentTrack?: MusicTrack
  connectedUsers?: string[] 
}

export default function RoomControls({ 
  room, 
  playlist, 
  onRemoveTrack, 
  onPlayTrack,
  currentTrack,
  connectedUsers = []  
}: RoomControlsProps) {
  const [copied, setCopied] = useState(false)

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Get unique users count (from both database and socket connections)
  const totalUsers = Math.max(room.users?.length || 0, connectedUsers.length)

  return (
    <div className="space-y-6">
      {/* Room Info */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">{room.name}</h2>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">{totalUsers} users</span>
          </div>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : room.code}
          </button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Live</span>
          </div>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">{connectedUsers.length} online</span>
        </div>
      </div>

      {/* Connected Users */}
      {connectedUsers.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green-400" />
            <h4 className="text-sm font-semibold text-white">Online Users</h4>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {connectedUsers.map((user, index) => (
              <div
                key={`${user}-${index}`}
                className="flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300 flex-1">{user}</span>
                {index === 0 && (
                  <Crown className="w-3 h-3 text-yellow-400"/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlist */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Playlist ({playlist.length})</h3>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlist.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No tracks in playlist</p>
              <p className="text-gray-500 text-sm mt-1">Search and add music to get started</p>
            </div>
          ) : (
            playlist.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id
              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group overflow-hidden ${
                    isCurrentTrack
                      ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg hover:transform' 
                      : 'bg-gray-700 hover:bg-gray-600 hover:transform'
                  }`}
                  onClick={() => onPlayTrack(track)}
                >
                  <span className={`text-sm w-6 text-center ${
                    isCurrentTrack ? 'text-blue-400 font-bold' : 'text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                  
                  {track.thumbnail && (
                    <div className="relative">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className={`w-10 h-10 rounded object-cover transition-all ${
                          isCurrentTrack ? 'ring-2 ring-blue-400' : ''
                        }`}
                      />
                      {isCurrentTrack && (
                        <div className="absolute inset-0 bg-blue-500/20 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate transition-colors ${
                      isCurrentTrack ? 'text-blue-100' : 'text-white group-hover:text-gray-100'
                    }`}>
                      {track.title}
                    </h4>
                    <p className={`text-sm truncate transition-colors ${
                      isCurrentTrack ? 'text-blue-300' : 'text-gray-400 group-hover:text-gray-300'
                    }`}>
                      {track.artist}
                    </p>
                  </div>
                  
                  {isCurrentTrack && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/30 rounded-full">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-300 font-medium">Now Playing</span>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation() 
                      console.log('Remove button clicked for track:', track.id) 
                      onRemoveTrack(track.id)
                    }}
                    className={`text-sm transition-all opacity-0 group-hover:opacity-100 px-2 py-1 rounded hover:bg-red-500/20 ${
                      isCurrentTrack 
                        ? 'text-red-300 hover:text-red-200 opacity-100' 
                        : 'text-red-400 hover:text-red-300'
                    }`}
                    title="Remove track"
                  >
                    Remove
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Room Stats */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-400">{playlist.length}</div>
            <div className="text-xs text-gray-400">Tracks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{connectedUsers.length}</div>
            <div className="text-xs text-gray-400">Online</div>
          </div>
        </div>
      </div>
    </div>
  )
}
