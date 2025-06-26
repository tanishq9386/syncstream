export interface Room {
  id: string
  name: string
  code: string
  hostId: string
  currentSong?: string
  isPlaying: boolean
  currentTime: number
  playlist: MusicTrack[]
  users: User[]
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  username: string
  roomId?: string
}

export interface MusicTrack {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  thumbnail?: string
  embedUrl?: string
}

export interface YouTubeVideo {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      medium: { url: string }
      default: { url: string }
    }
  }
}

export interface SocketEvents {
  'room:join': (data: { roomId: string; userId: string }) => void
  'room:leave': (data: { roomId: string; userId: string }) => void
  'music:play': (data: { roomId: string }) => void
  'music:pause': (data: { roomId: string }) => void
  'music:next': (data: { roomId: string }) => void
  'music:add': (data: { roomId: string; track: MusicTrack }) => void
  'music:sync': (data: { roomId: string; currentTime: number; isPlaying: boolean }) => void
}
