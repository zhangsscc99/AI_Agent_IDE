import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI IDE Agent',
  description: 'AI-powered coding assistant with workspace management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}




