'use client'

import { useState } from 'react'
import { Copy, Users, Music } from 'lucide-react'
import { Room, MusicTrack } from '@/types'

interface RoomControlsProps {
  room: Room
  playlist: MusicTrack[]
  onRemoveTrack: (trackId: string) => void
}

export default function RoomControls({ room, playlist, onRemoveTrack }: RoomControlsProps) {
  const [copied, setCopied] = useState(false)

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Room Info */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">{room.name}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">{room.users.length} users</span>
          </div>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : room.code}
          </button>
        </div>
      </div>

      {/* Playlist */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Playlist ({playlist.length})</h3>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlist.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No tracks in playlist</p>
          ) : (
            playlist.map((track, index) => (
              <div
                key={track.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  room.currentSong === track.id 
                    ? 'bg-purple-500/20 border border-purple-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span className="text-sm text-gray-400 w-6">{index + 1}</span>
                {track.thumbnail && (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-white">{track.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                </div>
                <button
                  onClick={() => onRemoveTrack(track.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
