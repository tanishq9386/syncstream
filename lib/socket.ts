import { io, Socket } from 'socket.io-client'

class SocketManager {
  private socket: Socket | null = null
  private static instance: SocketManager
  private connectionPromise: Promise<Socket> | null = null

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket)
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.disconnect()
      }

      this.socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id)
        this.connectionPromise = null
        resolve(this.socket!)
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        this.connectionPromise = null
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        this.connectionPromise = null
      })

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
      })

      this.socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error)
      })

      this.socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed')
        this.connectionPromise = null
      })
    })

    return this.connectionPromise
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionPromise = null
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  joinRoom(roomId: string, username: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:join', { roomId, username })
    }
  }

  leaveRoom(roomId: string, username: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', { roomId, username })
    }
  }

  syncMusic(roomId: string, currentTime: number, isPlaying: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('music:sync', { roomId, currentTime, isPlaying })
    }
  }

  playMusic(roomId: string, trackId?: string, currentTime: number = 0): void {
    if (this.socket?.connected) {
      this.socket.emit('music:play', { roomId, trackId, currentTime });
    }
  }

  pauseMusic(roomId: string, currentTime: number = 0): void {
    if (this.socket?.connected) {
      this.socket.emit('music:pause', { roomId, currentTime });
    }
  }

  changeTrack(roomId: string, trackId: string, autoPlay: boolean = true): void {
    if (this.socket?.connected) {
      this.socket.emit('track:change', { roomId, trackId, autoPlay });
    }
  }

  seekMusic(roomId: string, currentTime: number, isPlaying: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('music:seek', { roomId, currentTime, isPlaying });
    }
  }

  nextTrack(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('music:next', { roomId })
    }
  }

  addTrack(roomId: string, track: any): void {
    if (this.socket?.connected) {
      this.socket.emit('music:add', { roomId, track })
    }
  }

  removeTrack(roomId: string, trackId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('music:remove', { roomId, trackId })
    }
  }

  updateRoom(roomId: string, updates: any): void {
    if (this.socket?.connected) {
      this.socket.emit('room:update', { roomId, updates })
    }
  }

  // Event listener helpers
  onRoomUpdated(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('room:updated', callback)
    }
  }

  onMusicSync(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('music:sync', callback)
    }
  }

  onUserJoined(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user:joined', callback)
    }
  }

  onUserLeft(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user:left', callback)
    }
  }

  onRoomUsers(callback: (users: string[]) => void): void {
    if (this.socket) {
      this.socket.on('room:users', callback)
    }
  }

  onPlaylistUpdated(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('playlist:updated', callback)
    }
  }

  // Remove event listeners
  offRoomUpdated(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('room:updated', callback)
    }
  }

  offMusicSync(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('music:sync', callback)
    }
  }

  offUserJoined(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('user:joined', callback)
    }
  }

  offUserLeft(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('user:left', callback)
    }
  }

  offRoomUsers(callback?: (users: string[]) => void): void {
    if (this.socket) {
      this.socket.off('room:users', callback)
    }
  }

  offPlaylistUpdated(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('playlist:updated', callback)
    }
  }
}

export default SocketManager


export type { Socket } from 'socket.io-client'


export const createSocketConnection = (): Promise<Socket> => {
  return SocketManager.getInstance().connect()
}


export const useSocket = () => {
  const manager = SocketManager.getInstance()
  return {
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    socket: manager.getSocket(),
    isConnected: manager.isConnected(),
    
    joinRoom: manager.joinRoom.bind(manager),
    leaveRoom: manager.leaveRoom.bind(manager),
    syncMusic: manager.syncMusic.bind(manager),
    playMusic: manager.playMusic.bind(manager),
    pauseMusic: manager.pauseMusic.bind(manager),
    nextTrack: manager.nextTrack.bind(manager),
    addTrack: manager.addTrack.bind(manager),
    removeTrack: manager.removeTrack.bind(manager),
    updateRoom: manager.updateRoom.bind(manager),
    
    onRoomUpdated: manager.onRoomUpdated.bind(manager),
    onMusicSync: manager.onMusicSync.bind(manager),
    onUserJoined: manager.onUserJoined.bind(manager),
    onUserLeft: manager.onUserLeft.bind(manager),
    onRoomUsers: manager.onRoomUsers.bind(manager),
    onPlaylistUpdated: manager.onPlaylistUpdated.bind(manager),
    
    offRoomUpdated: manager.offRoomUpdated.bind(manager),
    offMusicSync: manager.offMusicSync.bind(manager),
    offUserJoined: manager.offUserJoined.bind(manager),
    offUserLeft: manager.offUserLeft.bind(manager),
    offRoomUsers: manager.offRoomUsers.bind(manager),
    offPlaylistUpdated: manager.offPlaylistUpdated.bind(manager)
  }
}