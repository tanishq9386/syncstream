export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { searchYouTubeTracks } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    const tracks = await searchYouTubeTracks(query)
    return NextResponse.json(tracks)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json([])
  }
}
