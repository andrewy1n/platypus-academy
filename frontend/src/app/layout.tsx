import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ChatProvider } from '../contexts/ChatProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Platypus Academy',
  description: 'AI-Powered STEM Practice Tests',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  )
}
