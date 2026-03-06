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

function isNew(event: { first_seen_at?: string | null, last_updated_at?: string | null }) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 3)
  const ts = event.last_updated_at || event.first_seen_at
  return ts ? new Date(ts) > cutoff : false
}

export default function CalendarApp({ events, venues }: { events: Event[], venues: Venue[] }) {
  const [view, setView] = useState<View>('grid')

  useEffect(() => {
    if (window.innerWidth <= 768) setView('list')
  }, [])

  // Auto-scroll to today in list view
  useEffect(() => {
    if (view !== 'list') return
    const todayStr = new Date().toLocaleDateString('en-CA')
    // Find closest day >= today
    const target = sortedDays.find(d => d >= todayStr)
    if (target && dayRefs.current[target]) {
      setTimeout(() => {
        dayRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [view, sortedDays])
  const [search, setSearch] = useState('')
  const [selectedVenues, setSelectedVenues] = useState<number[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [venueOpen, setVenueOpen] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<typeof events[0] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobilePanelDay, setMobilePanelDay] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [showBackToTop, setShowBackToTop] = useState(false)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (search && !e.artist.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedVenues.length > 0 && !selectedVenues.includes(e.venue_id)) return false
      return true
    })
  }, [events, search, selectedVenues])

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
        {/* Region tabs */}
        <div className={styles.regionTabs}>
          {['San Francisco', 'East Bay', 'North Bay', 'South Bay'].map(r => (
            <button
              key={r}
              className={`${styles.regionTab} ${selectedRegions.includes(r) ? styles.regionTabActive : ''}`}
              onClick={() => {
                const regionVenueIds = venues.filter(v => v.region === r).map(v => v.id)
                const isActive = selectedRegions.includes(r)
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
                {venues.map(v => (
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
                                          style={{ borderLeftColor: e.venue?.color || '#666' }}
                                        >{isNew(e) && <span className={styles.newStar}>◆</span>}{e.artist}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })

                          const panelEvents = selectedRow === rowIdx && selectedDay && dayEvents.length > 0

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
                                      <div key={e.id} className={styles.calInlineEvent}>
                                        <div className={styles.calInlineEventBar} style={{ background: e.venue?.color || '#666' }} />
                                        <div className={styles.calInlineEventInfo}>
                                          <div className={styles.calInlineEventArtist}>{isNew(e) && <span className={styles.newStar}>◆</span>}{e.artist}</div>
                                          <div className={styles.calInlineEventMeta}>{e.venue?.short_name}{e.show_time ? ` · ${e.show_time}` : ''}</div>
                                        </div>
                                        {e.ticket_url && (
                                          <a href={e.ticket_url} target="_blank" rel="noopener noreferrer" className={styles.mobileDayTicketBtn}>TIX</a>
                                        )}
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
        <h3 className={styles.eventArtist}>
          {isNew(e) && <span className={styles.newStar} title="Recently added or updated">◆</span>}
          {e.artist}
        </h3>
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
