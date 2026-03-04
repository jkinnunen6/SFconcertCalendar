'use client'

import { useState, useMemo } from 'react'
import type { Event, Venue } from '@/lib/supabase'
import styles from './CalendarApp.module.css'

type View = 'grid' | 'list'

function formatTime(showTime: string | null | undefined, dateStr: string) {
  if (showTime) return showTime
  // fallback: parse from datetime string if it has a time component
  if (dateStr && dateStr.includes('T')) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime()) && (d.getHours() || d.getMinutes())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }
  return null
}

function parseLocalDate(dateStr: string) {
  // Parse YYYY-MM-DD as local time to avoid UTC timezone shift
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

export default function CalendarApp({ events, venues }: { events: Event[], venues: Venue[] }) {
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [selectedVenues, setSelectedVenues] = useState<number[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Filter events
  const filtered = useMemo(() => {
    return events.filter(e => {
      if (search && !e.artist.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedVenues.length > 0 && !selectedVenues.includes(e.venue_id)) return false
      return true
    })
  }, [events, search, selectedVenues])

  // Group by date for list view
  const grouped = useMemo(() => {
    const map: Record<string, Event[]> = {}
    filtered.forEach(e => {
      const day = e.event_date.split('T')[0]
      if (!map[day]) map[day] = []
      map[day].push(e)
    })
    return map
  }, [filtered])

  // Events for current calendar month
  const monthEvents = useMemo(() => {
    const map: Record<number, Event[]> = {}
    filtered.forEach(e => {
      const d = new Date(e.event_date)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(e)
      }
    })
    return map
  }, [filtered, calYear, calMonth])

  // Events for selected day in grid view
  const dayEvents = useMemo(() => {
    if (!selectedDay) return []
    return filtered.filter(e => e.event_date.startsWith(selectedDay))
  }, [filtered, selectedDay])

  const toggleVenue = (id: number) => {
    setSelectedVenues(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
    setSelectedDay(null)
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.wordmark}>
            <span className={styles.wordmarkBay}>BAY</span>
            <span className={styles.wordmarkArea}>AREA</span>
            <span className={styles.wordmarkShows}>SHOWS</span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.eventCount}>{filtered.length} upcoming shows</span>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('list')}
              >LIST</button>
              <button
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('grid')}
              >CAL</button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Search */}
          <div className={styles.sideSection}>
            <label className={styles.sideLabel}>SEARCH</label>
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
              />
              {search && (
                <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>
              )}
            </div>
          </div>

          {/* Venue filter */}
          <div className={styles.sideSection}>
            <div className={styles.sideLabelRow}>
              <label className={styles.sideLabel}>VENUES</label>
              {selectedVenues.length > 0 && (
                <button className={styles.clearAll} onClick={() => setSelectedVenues([])}>
                  clear
                </button>
              )}
            </div>
            <div className={styles.venueList}>
              {venues.map(v => (
                <button
                  key={v.id}
                  className={`${styles.venueChip} ${selectedVenues.includes(v.id) ? styles.venueChipActive : ''}`}
                  onClick={() => toggleVenue(v.id)}
                  style={selectedVenues.includes(v.id) ? { borderColor: v.color, color: v.color } : {}}
                >
                  <span
                    className={styles.venueDot}
                    style={{ background: v.color }}
                  />
                  {v.short_name || v.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.main}>
          {view === 'list' ? (
            <div className={styles.listView}>
              {Object.keys(grouped).length === 0 ? (
                <div className={styles.empty}>No shows found</div>
              ) : (
                Object.entries(grouped).map(([day, dayEvts]) => (
                  <div key={day} className={styles.dayGroup}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayDow}>
                        {formatDayOfWeek(day + 'T00:00:00')}
                      </span>
                      <span className={styles.dayDate}>
                        {formatDateShort(day + 'T00:00:00')}
                      </span>
                      <span className={styles.dayCount}>{dayEvts.length} show{dayEvts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.eventList}>
                      {dayEvts.map(e => (
                        <EventCard key={e.id} event={e} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={styles.calView}>
              {/* Month nav */}
              <div className={styles.calHeader}>
                <button className={styles.calNav} onClick={prevMonth}>←</button>
                <h2 className={styles.calTitle}>
                  {MONTH_NAMES[calMonth]} <span className={styles.calYear}>{calYear}</span>
                </h2>
                <button className={styles.calNav} onClick={nextMonth}>→</button>
              </div>

              {/* Day labels */}
              <div className={styles.calGrid}>
                {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                  <div key={d} className={styles.calDayLabel}>{d}</div>
                ))}

                {/* Empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className={styles.calCell} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const evts = monthEvents[day] || []
                  const todayStr = new Date().toLocaleDateString('en-CA')
          const isToday = dayStr === todayStr
                  const isSelected = selectedDay === dayStr

                  return (
                    <div
                      key={day}
                      className={`${styles.calCell} ${styles.calCellDay} ${evts.length ? styles.calCellHasEvents : ''} ${isToday ? styles.calCellToday : ''} ${isSelected ? styles.calCellSelected : ''}`}
                      onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                    >
                      <span className={styles.calDayNum}>{day}</span>
                      {evts.length > 0 && (
                        <div className={styles.calEventDots}>
                          {evts.slice(0, 3).map(e => (
                            <span
                              key={e.id}
                              className={styles.calEventDot}
                              style={{ background: e.venue?.color || '#666' }}
                            />
                          ))}
                          {evts.length > 3 && (
                            <span className={styles.calEventMore}>+{evts.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Selected day events */}
              {selectedDay && dayEvents.length > 0 && (
                <div className={styles.calDayPanel}>
                  <div className={styles.calDayPanelHeader}>
                    <span>{formatDayOfWeek(selectedDay + 'T00:00:00')} {formatDateShort(selectedDay + 'T00:00:00')}</span>
                    <button className={styles.calDayClose} onClick={() => setSelectedDay(null)}>×</button>
                  </div>
                  <div className={styles.eventList}>
                    {dayEvents.map(e => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function EventCard({ event: e }: { event: Event }) {
  return (
    <div className={styles.eventCard}>
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
          {e.venue?.short_name || e.venue?.name}
        </div>
        <h3 className={styles.eventArtist}>{e.artist}</h3>
        {e.subtitle && <p className={styles.eventSubtitle}>{e.subtitle}</p>}
        <div className={styles.eventMeta}>
          {formatTime(e.show_time, e.event_date) && (
          <span className={styles.eventTime}>{formatTime(e.show_time, e.event_date)}</span>
        )}
          {e.ticket_status && e.ticket_status !== 'Available' && (
            <span className={styles.eventStatus}>{e.ticket_status}</span>
          )}
        </div>
      </div>
      {e.ticket_url && (
        <a
          href={e.ticket_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ticketBtn}
        >
          TICKETS
        </a>
      )}
    </div>
  )
}
