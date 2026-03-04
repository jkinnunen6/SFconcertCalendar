import { supabase, type Event, type Venue } from '@/lib/supabase'
import CalendarApp from '@/components/CalendarApp'

async function getEvents(): Promise<Event[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select(`*, venue:venues(*)`)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(1000)

  if (error) { console.error(error); return [] }
  return data as Event[]
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
