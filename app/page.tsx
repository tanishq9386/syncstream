'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Users, Plus } from 'lucide-react'

export default function Home() {
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const createRoom = async () => {
    if (!roomName.trim() || !username.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, username })
      })

      const data = await response.json()
      if (data.success) {
        router.push(`/room/${data.room.id}?username=${encodeURIComponent(username)}`)
      }
    } catch (error) {
      console.error('Error creating room:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!joinCode.trim() || !username.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode, username })
      })

      const data = await response.json()
      if (data.success) {
        router.push(`/room/${data.room.id}?username=${encodeURIComponent(username)}`)
      }
    } catch (error) {
      console.error('Error joining room:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500 rounded-full">
              <Music className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SyncStream</h1>
          <p className="text-gray-400">Listen to music together in sync</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Create New Room
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 mb-3"
              />
              <button
                onClick={createRoom}
                disabled={loading || !roomName.trim() || !username.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Room
              </button>
            </div>

            <div className="text-center text-gray-400">or</div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Join Existing Room
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter room code"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 mb-3"
              />
              <button
                onClick={joinRoom}
                disabled={loading || !joinCode.trim() || !username.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
