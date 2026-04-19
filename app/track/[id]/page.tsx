import TrackDetail from '@/components/TrackDetail'
import { use } from 'react'

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TrackDetail trackId={id} />
}
