'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { MusicTrack } from '@/types'

interface MusicSearchProps {
  onAddTrack: (track: MusicTrack) => void
}

export default function MusicSearch({ onAddTrack }: MusicSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(false)

  const searchTracks = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`)
      const tracks = await response.json()
      setResults(tracks)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchTracks()
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for music..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {track.thumbnail && (
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate text-white">{track.title}</h4>
              <p className="text-sm text-gray-400 truncate">{track.artist}</p>
            </div>
            <button
              onClick={() => onAddTrack(track)}
              className="p-2 bg-purple-500 hover:bg-purple-600 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
