const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

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

export interface MusicTrack {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  thumbnail?: string
  embedUrl?: string
}

export async function searchYouTubeTracks(query: string, maxResults = 20): Promise<MusicTrack[]> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    
    if (!apiKey) {
      throw new Error('Missing YouTube API key')
    }

    const searchQuery = `${query} music`
    
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `type=video&` +
      `videoCategoryId=10&` +
      `maxResults=${maxResults}&` +
      `key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to search YouTube')
    }

    const data = await response.json()
    
    return data.items.map((item: YouTubeVideo) => ({
      id: item.id.videoId,
      title: cleanTitle(item.snippet.title),
      artist: item.snippet.channelTitle,
      duration: 0,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium?.url,
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?enablejsapi=1`
    }))
  } catch (error) {
    console.error('YouTube search error:', error)
    return []
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/\(Official.*?\)/gi, '')
    .replace(/\[Official.*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}