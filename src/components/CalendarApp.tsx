'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { Event, Venue } from '@/lib/supabase'
import styles from './CalendarApp.module.css'

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

export default function CalendarApp({ events, venues }: { events: Event[], venues: Venue[] }) {
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [selectedVenues, setSelectedVenues] = useState<number[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [venueOpen, setVenueOpen] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<typeof events[0] | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [showBackToTop, setShowBackToTop] = useState(false)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (search && !e.artist.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedRegions.length > 0 && !selectedRegions.includes(e.venue?.region || '')) return false
      if (selectedVenues.length > 0 && !selectedVenues.includes(e.venue_id)) return false
      return true
    })
  }, [events, search, selectedVenues, selectedRegions])

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
    const map: Record<number, Event[]> = {}
    filtered.forEach(e => {
      const d = parseLocalDate(e.event_date)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(e)
      }
    })
    return map
  }, [filtered, calYear, calMonth])

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
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.wordmark}>
            <span className={styles.wordmarkBay}>BAY</span>
            <span className={styles.wordmarkArea}>AREA</span>
            <span className={styles.wordmarkShows}>SHOWS</span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.eventCount}>{filtered.length} upcoming shows</span>
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
                <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
              )}
            </div>
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
        {/* Region tabs */}
        <div className={styles.regionTabs}>
          {['San Francisco', 'East Bay', 'North Bay', 'South Bay'].map(r => (
            <button
              key={r}
              className={`${styles.regionTab} ${selectedRegions.includes(r) ? styles.regionTabActive : ''}`}
              onClick={() => setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Venue accordion filter */}
        <div className={styles.filterBar}>
          <button className={styles.accordionToggle} onClick={() => setVenueOpen(v => !v)}>
            <span>VENUES</span>
            {selectedVenues.length > 0 && <span className={styles.filterCount}>{selectedVenues.length} selected</span>}
            <span className={styles.accordionChevron}>{venueOpen ? '▲' : '▼'}</span>
          </button>
          {venueOpen && (
            <div className={styles.accordionContent}>
              {selectedVenues.length > 0 && (
                <button className={styles.clearAll} onClick={() => setSelectedVenues([])}>clear all</button>
              )}
              <div className={styles.venueGrid}>
                {venues
                  .filter(v => selectedRegions.length === 0 || selectedRegions.includes(v.region || ''))
                  .map(v => (
                    <button key={v.id} onClick={() => toggleVenue(v.id)}
                      className={`${styles.venueChip} ${selectedVenues.includes(v.id) ? styles.venueChipActive : ''}`}>
                      <span className={styles.venueDot} style={{background: v.color}} />
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
                        <EventCard key={e.id} event={e} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={styles.calView}>
              <div className={styles.calHeader}>
                <button className={styles.calNav} onClick={prevMonth}>←</button>
                <div className={styles.calHeaderCenter}>
                  <div className={styles.calTitleSelectors}>
                    <select
                      className={styles.calSelect}
                      value={calMonth}
                      onChange={e => setCalMonth(Number(e.target.value))}
                    >
                      {MONTH_NAMES.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      className={styles.calSelect}
                      value={calYear}
                      onChange={e => setCalYear(Number(e.target.value))}
                    >
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className={styles.calNav} onClick={nextMonth}>→</button>
              </div>

              <div className={styles.calGrid}>
                {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                  <div key={d} className={styles.calDayLabel}>{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className={styles.calCell} />
                ))}
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
                        <div className={styles.calEventList}>
                          {evts.map(e => (
                            <div
                              key={e.id}
                              className={styles.calEventRow}
                              onMouseEnter={ev => { setHoveredEvent(e); setTooltipPos({ x: ev.clientX, y: ev.clientY }) }}
                              onMouseMove={ev => setTooltipPos({ x: ev.clientX, y: ev.clientY })}
                              onMouseLeave={() => setHoveredEvent(null)}
                            >
                              <span
                                className={styles.calEventName}
                                style={{ background: e.venue?.color || '#666' }}
                              >{e.artist}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

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

      {/* Back to top */}
      {showBackToTop && (
        <button
          className={styles.backToTop}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >↑ TOP</button>
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
            {hoveredEvent.subtitle && <div className={styles.tooltipSubtitle}>{hoveredEvent.subtitle}</div>}
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
