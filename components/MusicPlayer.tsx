'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1 } from 'lucide-react'
import { MusicTrack } from '@/types'

interface MusicPlayerProps {
  currentTrack?: MusicTrack
  isPlaying: boolean
  currentTime: number
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onTimeUpdate: (time: number) => void
  onTrackEnded: () => void  
  hasPreviousTrack: boolean
  loopMode: 'none' | 'playlist' | 'single'
  onToggleLoop: () => void
}

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  onPlayPause,
  onNext,
  onPrevious,
  onTimeUpdate,
  onTrackEnded,  
  hasPreviousTrack,
  loopMode,
  onToggleLoop
}: MusicPlayerProps) {
  const playerRef = useRef<any>(null)
  const [player, setPlayer] = useState<any>(null)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready')
        setIsPlayerReady(true)
      }
    } else {
      setIsPlayerReady(true)
    }
  }, [])

  useEffect(() => {
    if (currentTrack && isPlayerReady && playerRef.current) {
      console.log('Track changed to:', currentTrack.title)
      
      if (player && currentVideoId !== currentTrack.id) {
        console.log('Loading new video without destroying player')
        
        player.loadVideoById({
          videoId: currentTrack.id,
          startSeconds: 0
        })
        
        setCurrentVideoId(currentTrack.id)
        
        setTimeout(() => {
          player.setVolume(isMuted ? 0 : volume)
          
          if (isPlaying) {
            player.playVideo()
          }
        }, 100)
        
        return
      }
      
      if (!player) {
        console.log('Creating new player for track:', currentTrack.title)

        const newPlayer = new window.YT.Player(playerRef.current, {
          height: '200',
          width: '100%',
          videoId: currentTrack.id,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
            enablejsapi: 1
          },
          events: {
            onReady: (event: any) => {
              console.log('Player ready for:', currentTrack.title)
              setPlayer(event.target)
              setCurrentVideoId(currentTrack.id)
              event.target.setVolume(isMuted ? 0 : volume)
              
              if (isPlaying) {
                console.log('Auto-playing new track')
                event.target.playVideo()
              }
            },
            onStateChange: (event: any) => {
              console.log('Player state changed:', event.data)
              
              if (event.data === window.YT.PlayerState.ENDED) {
                console.log('Video ended - calling parent handler')
                onTrackEnded()
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data)
            }
          }
        })
      }
    }
  }, [currentTrack, isPlayerReady])

  useEffect(() => {
    if (player && player.playVideo && player.pauseVideo) {
      console.log('Updating play state:', isPlaying)
      if (isPlaying) {
        player.playVideo()
      } else {
        player.pauseVideo()
      }
    }
  }, [isPlaying, player])

  useEffect(() => {
    if (player && player.setVolume) {
      player.setVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted, player])

  useEffect(() => {
    if (player && currentTrack) {
      const handleExternalSync = () => {
        const playerCurrentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
        const timeDiff = Math.abs(playerCurrentTime - currentTime);
        
        if (timeDiff > 1) {
          console.log('Syncing player time from', playerCurrentTime, 'to', currentTime);
          if (player.seekTo) {
            player.seekTo(currentTime, true);
          }
        }
      };
      const timeoutId = setTimeout(handleExternalSync, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentTime, player, currentTrack]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (newVolume === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const getLoopIcon = () => {
    switch (loopMode) {
      case 'single':
        return <Repeat1 className="w-5 h-5" />
      case 'playlist':
        return <Repeat className="w-5 h-5" />
      default:
        return <Repeat className="w-5 h-5" />
    }
  }

  const getLoopButtonClass = () => {
    const baseClass = "p-2 rounded-full transition-colors"
    switch (loopMode) {
      case 'single':
        return `${baseClass} bg-green-500 hover:bg-green-600 text-white`
      case 'playlist':
        return `${baseClass} bg-purple-500 hover:bg-purple-600 text-white`
      default:
        return `${baseClass} bg-gray-600 hover:bg-gray-500 text-gray-300`
    }
  }

  const getLoopTooltip = () => {
    switch (loopMode) {
      case 'single':
        return 'Loop: Single Track'
      case 'playlist':
        return 'Loop: Playlist'
      default:
        return 'Loop: Off'
    }
  }

  if (!currentTrack) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-center text-gray-400">
          <p>No track selected</p>
          <p className="text-sm mt-2">Add songs to your playlist to start listening</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        {currentTrack.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-16 h-16 rounded object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{currentTrack.title}</h3>
          <p className="text-gray-400 truncate">{currentTrack.artist}</p>
          <p className="text-xs text-purple-400 mt-1">{getLoopTooltip()}</p>
        </div>
      </div>

      {/* YouTube Player (hidden) */}
      <div style={{ display: 'none' }}>
        <div ref={playerRef}></div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={toggleMute}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="flex-1 max-w-32">
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${isMuted ? 0 : volume}%, #4b5563 ${isMuted ? 0 : volume}%, #4b5563 100%)`
            }}
          />
        </div>
        <span className="text-sm text-gray-400 w-8">{isMuted ? 0 : volume}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevious}
          disabled={!hasPreviousTrack}
          className="p-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 rounded-full transition-colors"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={onPlayPause}
          className="p-3 bg-purple-500 hover:bg-purple-600 rounded-full transition-colors"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <button
          onClick={onNext}
          className="p-2 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <button
          onClick={onToggleLoop}
          className={getLoopButtonClass()}
          title={getLoopTooltip()}
        >
          {getLoopIcon()}
        </button>
      </div>
    </div>
  )
}
