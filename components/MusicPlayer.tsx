'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, Volume2 } from 'lucide-react'
import { MusicTrack } from '@/types'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface MusicPlayerProps {
  currentTrack?: MusicTrack
  isPlaying: boolean
  currentTime: number
  onPlayPause: () => void
  onNext: () => void
  onTimeUpdate: (time: number) => void
}

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  onPlayPause,
  onNext,
  onTimeUpdate
}: MusicPlayerProps) {
  const playerRef = useRef<any>(null)
  const [volume, setVolume] = useState(50)
  const [apiReady, setApiReady] = useState(false)

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      
      window.onYouTubeIframeAPIReady = () => {
        setApiReady(true)
      }
    } else {
      setApiReady(true)
    }
  }, [])

  useEffect(() => {
    if (currentTrack && apiReady && window.YT) {
      initializePlayer()
    }
  }, [currentTrack, apiReady])

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy()
    }

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: currentTrack?.id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(volume)
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            onNext()
          }
        }
      }
    })
  }

  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      if (isPlaying) {
        playerRef.current.playVideo()
      } else {
        playerRef.current.pauseVideo()
      }
    }
  }, [isPlaying])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentTrack) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-center text-gray-400">No track selected</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div id="youtube-player" style={{ display: 'none' }}></div>
      
      <div className="flex items-center gap-4">
        {currentTrack.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-white">{currentTrack.title}</h3>
          <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <button
            onClick={onNext}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const newVolume = parseInt(e.target.value)
                setVolume(newVolume)
                if (playerRef.current && playerRef.current.setVolume) {
                  playerRef.current.setVolume(newVolume)
                }
              }}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
