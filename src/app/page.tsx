import { supabase, type Event, type Venue } from '@/lib/supabase'
import CalendarApp from '@/components/CalendarApp'

function getCutoffDate(): string {
  // Use Pacific Time — keep today's shows visible until 4am PT the next day
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now)

  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  const h = parseInt(parts.find(p => p.type === 'hour')!.value)

  if (h < 4) {
    // Before 4am PT — still show yesterday's events (late-night shows)
    const prev = new Date(`${y}-${m}-${d}T12:00:00`)
    prev.setDate(prev.getDate() - 1)
    return prev.toISOString().split('T')[0]
  }

  return `${y}-${m}-${d}`
}

async function getEvents(): Promise<Event[]> {
  const today = getCutoffDate()
  const PAGE = 1000
  const all: Event[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select(`*, venue:venues(*)`)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) { console.error(error); break }
    if (!data || data.length === 0) break
    all.push(...(data as Event[]))
    if (data.length < PAGE) break
    from += PAGE
  }

  return all
}

async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) { console.error(error); return [] }
  return data as Venue[]
}

export const revalidate = 3600 // revalidate every hour

export default async function Home() {
  const [events, venues] = await Promise.all([getEvents(), getVenues()])
  return <CalendarApp events={events} venues={venues} />
}
