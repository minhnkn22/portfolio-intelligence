import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Portfolio Intelligence', description: 'AI-powered portfolio analysis' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>)
}
