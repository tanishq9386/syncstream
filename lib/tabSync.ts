export class TabSync {
  private channel: BroadcastChannel
  private roomId: string

  constructor(roomId: string) {
    this.roomId = roomId
    this.channel = new BroadcastChannel(`syncstream-room-${roomId}`)
  }

  broadcast(type: string, data: any) {
    this.channel.postMessage({ type, data, timestamp: Date.now() })
  }

  onMessage(callback: (event: MessageEvent) => void) {
    this.channel.onmessage = callback
  }

  close() {
    this.channel.close()
  }
}
