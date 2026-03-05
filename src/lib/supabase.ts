import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Event = {
  id: number
  venue_id: number
  external_id: string
  artist: string
  subtitle: string | null
  event_date: string
  ticket_url: string | null
  image_url: string | null
  show_time: string | null
  ticket_status: string | null
  venue: Venue
}

export type Venue = {
  id: number
  name: string
  short_name: string
  color: string
  address: string
  city: string
  url: string
  region: string | null
}
