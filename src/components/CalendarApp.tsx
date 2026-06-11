'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { Event, Venue } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import styles from './CalendarApp.module.css'
import AuthButton from './AuthButton'
import AddEventModal from './AddEventModal'

type ShowStatus = 'watching' | 'going'

type View = 'grid' | 'list'

function formatTime(showTime: string | null | undefined, dateStr: string) {
  if (showTime) return showTime
  if (dateStr && dateStr.includes('T')) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime()) && (d.getHours() || d.getMinutes())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }
  return null
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateShort(dateStr: string) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDayOfWeek(dateStr: string) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

function isNew(event: { first_seen_at?: string | null, last_updated_at?: string | null }) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 1)
  const ts = event.first_seen_at
  return ts ? new Date(ts) > cutoff : false
}

// Full moon dates in Pacific Time, computed from the known Jan 6 2000 18:14 UTC full moon
// using the mean synodic period of 29.530588853 days. Covers ±2 years from now.
function getFullMoonDates(): Set<string> {
  const knownFullMoonMs = Date.UTC(2000, 0, 21, 4, 40, 0) // Jan 21 2000 04:40 UTC — confirmed full moon
  const lunarCycleMs = 29.530588853 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const startMs = now - 400 * 24 * 60 * 60 * 1000
  const endMs   = now + 730 * 24 * 60 * 60 * 1000

  const firstIdx = Math.ceil((startMs - knownFullMoonMs) / lunarCycleMs)
  const dates = new Set<string>()
  let t = knownFullMoonMs + firstIdx * lunarCycleMs
  while (t <= endMs) {
    dates.add(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(t)))
    t += lunarCycleMs
  }
  return dates
}

const FULL_MOON_DATES = getFullMoonDates()

// Build a map of date string → traditional moon name
function computeMoonNames(dates: Set<string>): Map<string, string> {
  const sorted = Array.from(dates).sort()
  const map = new Map<string, string>()

  // Group by YYYY-MM to detect Blue Moons (2nd full moon in a calendar month)
  const byMonth: Record<string, string[]> = {}
  for (const d of sorted) {
    const ym = d.slice(0, 7)
    if (!byMonth[ym]) byMonth[ym] = []
    byMonth[ym].push(d)
  }

  for (const d of sorted) {
    const parts  = d.split('-')
    const year   = Number(parts[0])
    const month  = Number(parts[1])
    const day    = Number(parts[2])
    const ym     = d.slice(0, 7)

    // Blue Moon — second full moon in the same calendar month
    if (byMonth[ym].length >= 2 && byMonth[ym][1] === d) {
      map.set(d, 'Blue Moon')
      continue
    }

    // Harvest Moon — full moon closest to the autumnal equinox (~Sep 22)
    if (month === 9 || month === 10) {
      const equinoxMs  = new Date(year, 8, 22, 12, 0, 0).getTime()
      const thisMoonMs = new Date(year, month - 1, day, 12, 0, 0).getTime()
      const thisDiff   = Math.abs(thisMoonMs - equinoxMs)
      // Approximate the neighbouring month's full moon by ±29.5 days
      const otherMoonMs = month === 9
        ? thisMoonMs + 29.53 * 86400000
        : thisMoonMs - 29.53 * 86400000
      const otherDiff = Math.abs(otherMoonMs - equinoxMs)

      if (thisDiff <= otherDiff) { map.set(d, 'Harvest Moon'); continue }
      if (month === 10)          { map.set(d, "Hunter's Moon"); continue }
      // Sep but not the closest to equinox — fall through to Corn Moon
    }

    const NAMES: Record<number, string> = {
       1: 'Wolf Moon',
       2: 'Snow Moon',
       3: 'Worm Moon',
       4: 'Pink Moon',
       5: 'Flower Moon',
       6: 'Strawberry Moon',
       7: 'Buck Moon',
       8: 'Sturgeon Moon',
       9: 'Corn Moon',
      10: "Hunter's Moon",
      11: 'Beaver Moon',
      12: 'Cold Moon',
    }
    map.set(d, NAMES[month] ?? 'Full Moon')
  }
  return map
}

const MOON_NAMES_MAP = computeMoonNames(FULL_MOON_DATES)

type UserEventRow = {
  id: number
  user_id: string
  artist: string
  venue_name: string
  city: string
  event_date: string
  show_time: string | null
  ticket_url: string | null
  status: 'watching' | 'going'
}

function userEventToEvent(row: UserEventRow): Event {
  const cityLabel = row.city && row.city !== 'Bay Area' ? row.city : null
  return {
    id: -row.id,
    venue_id: 0,
    external_id: `user-${row.id}`,
    artist: row.artist,
    subtitle: null,
    support: null,
    event_date: row.event_date,
    ticket_url: row.ticket_url,
    image_url: null,
    show_time: row.show_time,
    ticket_status: null,
    first_seen_at: null,
    last_updated_at: null,
    venue: {
      id: 0,
      name: cityLabel ? `${row.venue_name} · ${cityLabel}` : row.venue_name,
      short_name: cityLabel ? `${row.venue_name} · ${cityLabel}` : row.venue_name,
      color: '#a78bfa',
      address: '',
      city: row.city,
      url: '',
      region: null,
    },
    userAdded: true,
    userEventDbId: row.id,
    userCity: row.city,
  }
}

export default function CalendarApp({ events, venues }: { events: Event[], venues: Venue[] }) {
  const [view, setView] = useState<View>('grid')

  useEffect(() => {
    if (window.innerWidth <= 768) setView('list')
  }, [])


  const [search, setSearch] = useState('')
  const [selectedVenues, setSelectedVenues] = useState<number[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [venueOpen, setVenueOpen] = useState(false)
  const [regionOpen, setRegionOpen] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<typeof events[0] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobilePanelDay, setMobilePanelDay] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [showBackToTop, setShowBackToTop] = useState(false)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hasAutoScrolled = useRef(false)

  // Auth + show statuses
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [statuses, setStatuses] = useState<Record<number, ShowStatus>>({})
  const [myShowsOnly, setMyShowsOnly] = useState(false)
  const [userEventsList, setUserEventsList] = useState<Event[]>([])
  const [addEventOpen, setAddEventOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) { loadStatuses(); loadUserEvents() }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { loadStatuses(); loadUserEvents() }
      else { setStatuses({}); setMyShowsOnly(false); setUserEventsList([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadStatuses() {
    const { data } = await supabase.from('user_show_status').select('event_id,status')
    if (data) {
      const map: Record<number, ShowStatus> = {}
      data.forEach(r => { map[r.event_id] = r.status })
      setStatuses(map)
    }
  }

  async function loadUserEvents() {
    const { data } = await supabase.from('user_events').select('*').order('event_date')
    if (data) {
      const evts = (data as UserEventRow[]).map(userEventToEvent)
      setUserEventsList(evts)
      setStatuses(prev => {
        const additions: Record<number, ShowStatus> = {}
        data.forEach((row: UserEventRow) => { additions[-row.id] = row.status })
        return { ...prev, ...additions }
      })
    }
  }

  async function deleteUserEvent(dbId: number) {
    await supabase.from('user_events').delete().eq('id', dbId)
    setUserEventsList(prev => prev.filter(e => e.userEventDbId !== dbId))
    setStatuses(prev => { const n = { ...prev }; delete n[-dbId]; return n })
  }

  async function toggleStatus(eventId: number, status: ShowStatus) {
    if (!user) return
    const ue = userEventsList.find(e => e.id === eventId)
    if (ue?.userAdded && ue.userEventDbId != null) {
      if (statuses[eventId] === status) return
      await supabase.from('user_events').update({ status }).eq('id', ue.userEventDbId)
      setStatuses(prev => ({ ...prev, [eventId]: status }))
      return
    }
    if (statuses[eventId] === status) {
      await supabase.from('user_show_status').delete().eq('event_id', eventId)
      setStatuses(prev => { const n = { ...prev }; delete n[eventId]; return n })
    } else {
      await supabase.from('user_show_status').upsert(
        { user_id: user.id, event_id: eventId, status },
        { onConflict: 'user_id,event_id' }
      )
      setStatuses(prev => ({ ...prev, [eventId]: status }))
    }
  }

  const allEvents = useMemo(() => [...events, ...userEventsList], [events, userEventsList])

  const filtered = useMemo(() => {
    return allEvents.filter(e => {
      if (search && !e.artist.toLowerCase().includes(search.toLowerCase())) return false
      // User-added events bypass the venue filter — they always show
      if (selectedVenues.length > 0 && !selectedVenues.includes(e.venue_id) && !e.userAdded) return false
      if (myShowsOnly && !statuses[e.id]) return false
      return true
    })
  }, [allEvents, search, selectedVenues, myShowsOnly, statuses])

  const grouped = useMemo(() => {
    const map: Record<string, Event[]> = {}
    filtered.forEach(e => {
      const day = e.event_date.split('T')[0]
      if (!map[day]) map[day] = []
      map[day].push(e)
    })
    return map
  }, [filtered])

  const sortedDays = useMemo(() => Object.keys(grouped).sort(), [grouped])

  // Auto-scroll to today in list view — only once on initial load
  useEffect(() => {
    if (view !== 'list') { hasAutoScrolled.current = false; return }
    if (hasAutoScrolled.current) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    const target = sortedDays.find(d => d >= todayStr)
    if (target && dayRefs.current[target]) {
      hasAutoScrolled.current = true
      setTimeout(() => {
        dayRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [view, sortedDays])

  const jumpToDay = useCallback((delta: number, currentDay: string) => {
    const idx = sortedDays.indexOf(currentDay)
    const target = sortedDays[idx + delta]
    if (target && dayRefs.current[target]) {
      dayRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [sortedDays])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const monthEvents = useMemo(() => {
    const map: Record<string, Record<number, Event[]>> = {}
    filtered.forEach(e => {
      const d = parseLocalDate(e.event_date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      if (!map[key]) map[key] = {}
      const day = d.getDate()
      if (!map[key][day]) map[key][day] = []
      map[key][day].push(e)
    })
    return map
  }, [filtered])

  const dayEvents = useMemo(() => {
    if (!selectedDay) return []
    return filtered.filter(e => e.event_date.startsWith(selectedDay))
  }, [filtered, selectedDay])

  const toggleVenue = (id: number) => {
    setSelectedVenues(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  }

  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Moon name tooltip
  const [moonLabel, setMoonLabel] = useState<{ name: string, x: number, y: number } | null>(null)
  useEffect(() => {
    if (!moonLabel) return
    const dismiss = () => setMoonLabel(null)
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [moonLabel])

  // Compute which months have events
  const activeMonths = useMemo(() => {
    const seen = new Set<string>()
    filtered.forEach(e => {
      const d = parseLocalDate(e.event_date)
      seen.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`)
    })
    return Array.from(seen).sort().map(key => {
      const parts = key.split('-'); const y = Number(parts[0]); const m = Number(parts[1])
      return { year: y, month: m, key }
    })
  }, [filtered])

  const jumpToMonth = (delta: number, currentKey: string) => {
    const idx = activeMonths.findIndex(m => m.key === currentKey)
    const target = activeMonths[idx + delta]
    if (target && monthRefs.current[target.key]) {
      monthRefs.current[target.key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.wordmark}>
            <span className={styles.wordmarkBay}>BAY</span>
            <span className={styles.wordmarkArea}>AREA</span>
            <span className={styles.wordmarkShows}>SHOWS</span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.eventCount}>{filtered.length} upcoming shows</span>
            {/* Desktop search — always visible */}
            <div className={`${styles.searchWrap} ${styles.searchDesktop}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Artist name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
              )}
            </div>
            {/* Mobile controls — search icon + toggle inline with title */}
            <div className={styles.mobileControls}>
              <button className={styles.mobileSearchBtn} onClick={() => setSearchOpen(o => !o)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                {search && <span className={styles.mobileSearchDot} />}
              </button>
              <div className={styles.viewToggle}>
                <button className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setView('list')}>LIST</button>
                <button className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`} onClick={() => setView('grid')}>CAL</button>
              </div>
            </div>
            {/* Desktop view toggle */}
            <div className={`${styles.viewToggle} ${styles.desktopToggle}`}>
              <button className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setView('list')}>LIST</button>
              <button className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`} onClick={() => setView('grid')}>CAL</button>
            </div>
            {user && (
              <button className={styles.addEventBtn} onClick={() => setAddEventOpen(true)} title="Add a show">
                + ADD
              </button>
            )}
            <AuthButton />
          </div>
          {/* Mobile search flyout */}
          {searchOpen && (
            <div className={styles.mobileSearchFlyout}>
              <div className={styles.searchWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Artist name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
                )}
                <button className={styles.searchClose} onClick={() => setSearchOpen(false)}>✕</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className={styles.layout}>
        {/* Sticky filter bar */}
        <div className={styles.stickyFilters}>
          <div className={styles.filterRow}>
            {/* Region dropdown */}
            <button
              className={`${styles.filterBtn} ${selectedRegions.length > 0 ? styles.filterBtnActive : ''} ${regionOpen ? styles.filterBtnOpen : ''}`}
              onClick={() => { setRegionOpen(o => !o); setVenueOpen(false) }}
            >
              REGION
              {selectedRegions.length > 0 && <span className={styles.filterCount}>{selectedRegions.length}</span>}
              <span className={styles.accordionChevron}>{regionOpen ? '▲' : '▼'}</span>
            </button>

            {/* Venues dropdown */}
            <button
              className={`${styles.filterBtn} ${selectedVenues.length > 0 ? styles.filterBtnActive : ''} ${venueOpen ? styles.filterBtnOpen : ''}`}
              onClick={() => { setVenueOpen(o => !o); setRegionOpen(false) }}
            >
              VENUES
              {selectedVenues.length > 0 && <span className={styles.filterCount}>{selectedVenues.length}</span>}
              <span className={styles.accordionChevron}>{venueOpen ? '▲' : '▼'}</span>
            </button>

            {user && (
              <button
                className={`${styles.filterBtn} ${myShowsOnly ? styles.filterBtnMyShows : ''}`}
                onClick={() => setMyShowsOnly(o => !o)}
              >
                {myShowsOnly ? '● MY SHOWS' : '○ MY SHOWS'}
              </button>
            )}

            {(selectedRegions.length > 0 || selectedVenues.length > 0) && (
              <button className={styles.clearAllInline} onClick={() => { setSelectedRegions([]); setSelectedVenues([]) }}>
                clear all
              </button>
            )}
          </div>

          {/* Region dropdown panel */}
          {regionOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.venueGrid}>
                {['San Francisco', 'East Bay', 'North Bay', 'South Bay'].map(r => {
                  const isActive = selectedRegions.includes(r)
                  return (
                    <button
                      key={r}
                      className={`${styles.venueChip} ${isActive ? styles.venueChipActiveRegion : ''}`}
                      onClick={() => {
                        const regionVenueIds = venues.filter(v => v.region === r).map(v => v.id)
                        setSelectedRegions(prev => isActive ? prev.filter(x => x !== r) : [...prev, r])
                        if (isActive) {
                          setSelectedVenues(prev => prev.filter(id => !regionVenueIds.includes(id)))
                        } else {
                          setSelectedVenues(prev => Array.from(new Set([...prev, ...regionVenueIds])))
                        }
                      }}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Venue dropdown panel */}
          {venueOpen && (
            <div className={styles.filterDropdown}>
              {selectedVenues.length > 0 && (
                <button className={styles.clearAll} onClick={() => setSelectedVenues([])}>clear all</button>
              )}
              <div className={styles.venueGrid}>
                {[...venues].sort((a, b) => a.name.replace(/^the /i, '').localeCompare(b.name.replace(/^the /i, ''))).map(v => (
                  <button key={v.id} onClick={() => toggleVenue(v.id)}
                    className={`${styles.venueChip} ${selectedVenues.includes(v.id) ? styles.venueChipActive : ''}`}
                    style={selectedVenues.includes(v.id) ? { background: v.color, borderColor: v.color, color: '#fff' } : { borderColor: v.color }}>
                    {v.short_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <main className={styles.main}>
          {view === 'list' ? (
            <div className={styles.listView}>
              {Object.keys(grouped).length === 0 ? (
                <div className={styles.empty}>No shows found</div>
              ) : (
                Object.entries(grouped).map(([day, dayEvts]) => (
                  <div key={day} className={styles.dayGroup} ref={el => { dayRefs.current[day] = el }}>
                    <div className={styles.dayHeader}>
                      <button
                        className={styles.dayJump}
                        onClick={() => jumpToDay(-1, day)}
                        disabled={sortedDays.indexOf(day) === 0}
                      >↑</button>
                      <span className={styles.dayDow}>
                        {formatDayOfWeek(day + 'T00:00:00')}
                      </span>
                      <span className={styles.dayDate}>
                        {formatDateShort(day + 'T00:00:00')}
                        {FULL_MOON_DATES.has(day) && (
                          <span
                            className={styles.fullMoon}
                            onClick={ev => { ev.stopPropagation(); const n = MOON_NAMES_MAP.get(day); if (n) setMoonLabel({ name: n, x: ev.clientX, y: ev.clientY }) }}
                          > 🌕</span>
                        )}
                      </span>
                      <button
                        className={styles.dayJump}
                        onClick={() => jumpToDay(1, day)}
                        disabled={sortedDays.indexOf(day) === sortedDays.length - 1}
                      >↓</button>
                      <span className={styles.dayCount}>{dayEvts.length} show{dayEvts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.eventList}>
                      {dayEvts.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          status={statuses[e.id]}
                          onToggleStatus={user ? (s) => toggleStatus(e.id, s) : undefined}
                          onDelete={e.userAdded && e.userEventDbId != null ? () => deleteUserEvent(e.userEventDbId!) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={styles.calView}>
              {activeMonths.length === 0 ? (
                <div className={styles.empty}>No shows found</div>
              ) : (
                activeMonths.map(({ year, month, key }, idx) => {
                  const daysInMonth = getDaysInMonth(year, month)
                  const firstDay = getFirstDayOfMonth(year, month)
                  const eventsForMonth = monthEvents[`${year}-${String(month).padStart(2, '0')}`] || {}
                  const todayStr = new Date().toLocaleDateString('en-CA')

                  return (
                    <div key={key} className={styles.calMonth} ref={el => { monthRefs.current[key] = el }}>
                      <div className={styles.calHeader}>
                        <button className={styles.calNav} onClick={() => jumpToMonth(-1, key)} disabled={idx === 0}>←</button>
                        <div className={styles.calHeaderCenter}>
                          <span className={styles.calTitle}>
                            {MONTH_NAMES[month]} <span className={styles.calYear}>{year}</span>
                          </span>
                        </div>
                        <button className={styles.calNav} onClick={() => jumpToMonth(1, key)} disabled={idx === activeMonths.length - 1}>→</button>
                      </div>

                      <div className={styles.calGrid}>
                        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                          <div key={d} className={styles.calDayLabel}>{d}</div>
                        ))}
                      </div>
                      {(() => {
                        // Build rows of 7 cells each
                        const totalCells = firstDay + daysInMonth
                        const numRows = Math.ceil(totalCells / 7)
                        const selectedRow = selectedDay
                          ? Math.floor((firstDay + (parseInt(selectedDay.split('-')[2]) - 1)) / 7)
                          : -1

                        return Array.from({ length: numRows }).map((_, rowIdx) => {
                          const cells = Array.from({ length: 7 }).map((_, colIdx) => {
                            const cellIdx = rowIdx * 7 + colIdx
                            const day = cellIdx - firstDay + 1
                            if (day < 1 || day > daysInMonth) {
                              return <div key={`empty-${cellIdx}`} className={styles.calCell} />
                            }
                            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            const evts = eventsForMonth[day] || []
                            const isToday = dayStr === todayStr
                            const isSelected = selectedDay === dayStr
                            return (
                              <div
                                key={day}
                                className={`${styles.calCell} ${styles.calCellDay} ${evts.length ? styles.calCellHasEvents : ''} ${isToday ? styles.calCellToday : ''} ${isSelected ? styles.calCellSelected : ''}`}
                                onClick={() => { setSelectedDay(isSelected ? null : dayStr); setMobilePanelDay(isSelected ? null : dayStr) }}
                              >
                                <div className={styles.calDayRow}>
                                  <span className={styles.calDayNum}>{day}</span>
                                  {FULL_MOON_DATES.has(dayStr) && (
                                    <span
                                      className={styles.fullMoon}
                                      onClick={ev => { ev.stopPropagation(); const n = MOON_NAMES_MAP.get(dayStr); if (n) setMoonLabel({ name: n, x: ev.clientX, y: ev.clientY }) }}
                                    >🌕</span>
                                  )}
                                </div>
                                {evts.length > 0 && (
                                  <div className={styles.calEventList}>
                                    {evts.map(e => (
                                      <div
                                        key={e.id}
                                        className={[
                                          styles.calEventRow,
                                          statuses[e.id] === 'watching' ? styles.calEventRowWatching : '',
                                          statuses[e.id] === 'going' ? styles.calEventRowGoing : '',
                                        ].join(' ')}
                                        onMouseEnter={ev => { setHoveredEvent(e); setTooltipPos({ x: ev.clientX, y: ev.clientY }) }}
                                        onMouseMove={ev => setTooltipPos({ x: ev.clientX, y: ev.clientY })}
                                        onMouseLeave={() => setHoveredEvent(null)}
                                      >
                                        <span
                                          className={styles.calEventName}
                                          style={{ borderLeftColor: e.venue?.color || '#666' }}
                                        >{isNew(e) && <span className={styles.newStar}>◆</span>}{e.artist}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })

                          const panelMonth = `${year}-${String(month + 1).padStart(2, '0')}`
                          const panelEvents = selectedRow === rowIdx && selectedDay && selectedDay.startsWith(panelMonth) && dayEvents.length > 0

                          return (
                            <div key={`row-${rowIdx}`}>
                              <div className={styles.calRow}>{cells}</div>
                              {panelEvents && (
                                <div className={styles.calInlinePanel}>
                                  <div className={styles.calInlinePanelHeader}>
                                    <span>{formatDayOfWeek(selectedDay + 'T00:00:00')} · {formatDateShort(selectedDay + 'T00:00:00')} · {dayEvents.length} show{dayEvents.length !== 1 ? 's' : ''}</span>
                                    <button className={styles.calDayClose} onClick={() => { setSelectedDay(null); setMobilePanelDay(null) }}>×</button>
                                  </div>
                                  <div className={styles.calInlinePanelList}>
                                    {dayEvents.map(e => (
                                      <div key={e.id} className={`${styles.calInlineEvent} ${statuses[e.id] === 'watching' ? styles.calInlineWatching : ''} ${statuses[e.id] === 'going' ? styles.calInlineGoing : ''}`}>
                                        <div className={styles.calInlineEventBar} style={{ background: e.venue?.color || '#666' }} />
                                        <div className={styles.calInlineEventInfo}>
                                          <div className={styles.calInlineEventArtist}>{isNew(e) && <span className={styles.newStar}>◆</span>}{e.artist}</div>
                                          {e.support && <div className={styles.calInlineEventSupport}>w/ {e.support}</div>}
                                          <div className={styles.calInlineEventMeta}>
                                            {e.venue?.short_name}{e.show_time ? ` · ${e.show_time}` : ''}
                                            {statuses[e.id] && <span className={statuses[e.id] === 'watching' ? styles.statusLabelWatching : styles.statusLabelGoing}> · {statuses[e.id] === 'watching' ? 'WATCHING' : 'GOING'}</span>}
                                          </div>
                                          {user && (
                                            <div className={styles.statusBtns}>
                                              <button
                                                className={`${styles.statusBtn} ${statuses[e.id] === 'watching' ? styles.statusBtnWatching : ''}`}
                                                onClick={() => toggleStatus(e.id, 'watching')}
                                              >WATCHING</button>
                                              <button
                                                className={`${styles.statusBtn} ${statuses[e.id] === 'going' ? styles.statusBtnGoing : ''}`}
                                                onClick={() => toggleStatus(e.id, 'going')}
                                              >GOING</button>
                                            </div>
                                          )}
                                          {e.userAdded && e.userEventDbId != null && (
                                            <button className={styles.deleteBtn} onClick={() => deleteUserEvent(e.userEventDbId!)}>
                                              REMOVE
                                            </button>
                                          )}
                                        </div>
                                        <div className={styles.eventBtns}>
                                          {e.ticket_url && (
                                            <a href={e.ticket_url} target="_blank" rel="noopener noreferrer" className={styles.ticketBtn}>
                                              <span className={styles.btnDesktop}>TICKETS</span>
                                              <span className={styles.btnMobile}>TIX</span>
                                            </a>
                                          )}
                                          <AddToCalBtn event={e} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      })()}


                    </div>
                  )
                })
              )}
            </div>
          )}
        </main>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          className={styles.backToTop}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >↑ TOP</button>
      )}

      {/* Add event modal */}
      {addEventOpen && user && (
        <AddEventModal
          user={user}
          onSuccess={loadUserEvents}
          onClose={() => setAddEventOpen(false)}
        />
      )}

      {/* Moon name popup */}
      {moonLabel && (
        <div
          className={styles.moonPopup}
          style={{ top: moonLabel.y - 44, left: moonLabel.x }}
          onClick={ev => ev.stopPropagation()}
        >
          🌕 {moonLabel.name}
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredEvent && (
        <div
          className={styles.eventTooltip}
          style={{
            top: tooltipPos.y + 16,
            ...(tooltipPos.x + 260 > window.innerWidth
              ? { right: window.innerWidth - tooltipPos.x + 8, left: 'auto' }
              : { left: tooltipPos.x + 16 })
          }}
        >
          {hoveredEvent.image_url && (
            <img src={hoveredEvent.image_url} alt={hoveredEvent.artist} className={styles.tooltipImage} />
          )}
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipVenue} style={{ color: hoveredEvent.venue?.color || '#aaa' }}>
              {hoveredEvent.venue?.short_name}
            </div>
            <div className={styles.tooltipArtist}>{hoveredEvent.artist}</div>
            {hoveredEvent.support && <div className={styles.tooltipSubtitle}>w/ {hoveredEvent.support}</div>}
            {hoveredEvent.show_time && <div className={styles.tooltipTime}>{hoveredEvent.show_time}</div>}
            {hoveredEvent.ticket_status && hoveredEvent.ticket_status !== 'Available' && (
              <div className={styles.tooltipStatus}>{hoveredEvent.ticket_status}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getCalTimes(event: Event) {
  const date = event.event_date.replace(/-/g, '')
  let dtStart = date, dtEnd = date
  if (event.show_time) {
    const t = event.show_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (t) {
      let h = parseInt(t[1]); const m = t[2]
      if (t[3].toUpperCase() === 'PM' && h !== 12) h += 12
      if (t[3].toUpperCase() === 'AM' && h === 12) h = 0
      const hh = String(h).padStart(2, '0')
      dtStart = `${date}T${hh}${m}00`
      dtEnd = `${date}T${String(h + 2).padStart(2, '0')}${m}00`
    }
  }
  return { dtStart, dtEnd }
}

function makeICS(event: Event) {
  const { dtStart, dtEnd } = getCalTimes(event)
  const title = event.artist.replace(/,/g, '\\,')
  const location = event.venue ? `${event.venue.name}\\, ${event.venue.address || ''}` : ''
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
    `SUMMARY:${title}`, `LOCATION:${location}`,
    `URL:${event.ticket_url || ''}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${event.artist.replace(/[^a-z0-9]/gi, '_')}.ics`
  a.click(); URL.revokeObjectURL(url)
}

function makeGoogleCalUrl(event: Event) {
  const { dtStart, dtEnd } = getCalTimes(event)
  const location = event.venue ? `${event.venue.name}, ${event.venue.address || ''}` : ''
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.artist,
    dates: `${dtStart}/${dtEnd}`,
    location,
    details: event.ticket_url || ''
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function AddToCalBtn({ event }: { event: Event }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.calDropWrap}>
      <button className={styles.calBtn} onClick={() => setOpen(o => !o)}>
        <span className={styles.calBtnDesktop}>ADD TO CAL</span>
        <span className={styles.calBtnMobile}>+ CAL</span>
      </button>
      {open && (
        <>
          <div className={styles.calDropOverlay} onClick={() => setOpen(false)} />
          <div className={styles.calDrop}>
            <a href={makeGoogleCalUrl(event)} target="_blank" rel="noopener noreferrer"
               className={styles.calDropItem} onClick={() => setOpen(false)}>
              Google Calendar
            </a>
            <button className={styles.calDropItem} onClick={() => { makeICS(event); setOpen(false) }}>
              Download .ics
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EventCard({ event: e, status, onToggleStatus, onDelete }: {
  event: Event
  status?: ShowStatus
  onToggleStatus?: (status: ShowStatus) => void
  onDelete?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={[
        styles.eventCard,
        expanded ? styles.eventCardExpanded : '',
        status === 'watching' ? styles.eventCardWatching : '',
        status === 'going' ? styles.eventCardGoing : '',
      ].join(' ')}
      style={{ borderLeft: `3px ${e.userAdded ? 'dashed' : 'solid'} ${e.venue?.color || '#333'}` }}
      onClick={() => setExpanded(x => !x)}
    >
      {e.image_url && (
        <div className={styles.eventImg}>
          <img src={e.image_url} alt={e.artist} loading="lazy" />
        </div>
      )}
      <div className={styles.eventInfo}>
        <div className={styles.eventVenue}>
          <span
            className={styles.eventVenueDot}
            style={{ background: e.venue?.color || '#666' }}
          />
          {e.userAdded && <span className={styles.userAddedMark} title="Your added show">✎ </span>}
          {e.venue?.short_name || e.venue?.name}
        </div>
        <h3 className={`${styles.eventArtist} ${expanded ? styles.eventArtistExpanded : ''}`}>
          {isNew(e) && <span className={styles.newStar} title="Recently added">◆</span>}
          {e.artist}
        </h3>
        {e.support && <p className={`${styles.eventSubtitle} ${expanded ? styles.eventSubtitleExpanded : ''}`}>w/ {e.support}</p>}
        <div className={styles.eventMeta}>
          {formatTime(e.show_time, e.event_date) && (
            <span className={styles.eventTime}>{formatTime(e.show_time, e.event_date)}</span>
          )}
          {status && (
            <span className={status === 'watching' ? styles.statusLabelWatching : styles.statusLabelGoing}>
              {status === 'watching' ? 'WATCHING' : 'GOING'}
            </span>
          )}
          {e.ticket_status && e.ticket_status !== 'Available' && (
            <span className={styles.eventStatus}>{e.ticket_status}</span>
          )}
        </div>
        {expanded && onToggleStatus && (
          <div className={styles.statusBtns} onClick={ev => ev.stopPropagation()}>
            <button
              className={`${styles.statusBtn} ${status === 'watching' ? styles.statusBtnWatching : ''}`}
              onClick={() => onToggleStatus('watching')}
            >WATCHING</button>
            <button
              className={`${styles.statusBtn} ${status === 'going' ? styles.statusBtnGoing : ''}`}
              onClick={() => onToggleStatus('going')}
            >GOING</button>
          </div>
        )}
        {expanded && onDelete && (
          <button
            className={styles.deleteBtn}
            onClick={ev => { ev.stopPropagation(); onDelete() }}
          >REMOVE SHOW</button>
        )}
      </div>
      <div className={styles.eventBtns} onClick={ev => ev.stopPropagation()}>
        {e.ticket_url && (
          <a href={e.ticket_url} target="_blank" rel="noopener noreferrer" className={styles.ticketBtn}>
            <span className={styles.btnDesktop}>TICKETS</span>
            <span className={styles.btnMobile}>TIX</span>
          </a>
        )}
        <AddToCalBtn event={e} />
      </div>
    </div>
  )
}
