'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import styles from './AddEventModal.module.css'

type ShowStatus = 'watching' | 'going'

type Props = {
  user: User
  onSuccess: () => void
  onClose: () => void
}

export default function AddEventModal({ user, onSuccess, onClose }: Props) {
  const supabase = createClient()
  const [artist, setArtist] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('Bay Area')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  const [status, setStatus] = useState<ShowStatus>('going')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artist.trim() || !venue.trim() || !date) {
      setError('Artist, venue, and date are required.')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('user_events').insert({
      user_id: user.id,
      artist: artist.trim(),
      venue_name: venue.trim(),
      city: city.trim() || 'Bay Area',
      event_date: date,
      show_time: time.trim() || null,
      ticket_url: ticketUrl.trim() || null,
      status,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>ADD SHOW</span>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            ARTIST <span className={styles.req}>*</span>
            <input
              className={styles.input}
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="Artist name"
              autoFocus
            />
          </label>
          <label className={styles.label}>
            VENUE <span className={styles.req}>*</span>
            <input
              className={styles.input}
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="Venue name"
            />
          </label>
          <label className={styles.label}>
            CITY
            <input
              className={styles.input}
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Bay Area"
            />
          </label>
          <div className={styles.row}>
            <label className={styles.label} style={{ flex: 1 }}>
              DATE <span className={styles.req}>*</span>
              <input
                className={styles.input}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
            <label className={styles.label} style={{ flex: 1 }}>
              TIME
              <input
                className={styles.input}
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="8:00 PM"
              />
            </label>
          </div>
          <label className={styles.label}>
            TICKET URL
            <input
              className={styles.input}
              value={ticketUrl}
              onChange={e => setTicketUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>STATUS</span>
            <div className={styles.statusRow}>
              <button
                type="button"
                className={`${styles.statusBtn} ${status === 'watching' ? styles.statusWatching : ''}`}
                onClick={() => setStatus('watching')}
              >WATCHING</button>
              <button
                type="button"
                className={`${styles.statusBtn} ${status === 'going' ? styles.statusGoing : ''}`}
                onClick={() => setStatus('going')}
              >GOING</button>
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>CANCEL</button>
            <button type="submit" className={styles.save} disabled={saving}>
              {saving ? 'SAVING…' : 'SAVE SHOW'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
