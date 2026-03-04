import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bay Area Concerts',
  description: 'Every show worth seeing in the Bay Area',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
