'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HomePage from '../../components/HomePage'
import CreateSession from '../../components/CreateSession'

export default function HomePageRoute() {
  const [showCreateSession, setShowCreateSession] = useState(false)
  const router = useRouter()

  const handleNewSession = () => {
    setShowCreateSession(true)
  }

  const handleCreateSession = (sessionId: string) => {
    // Navigate to practice session with the session ID
    router.push(`/practice/${sessionId}`)
  }

  const handlePreviousSessions = () => {
    router.push('/sessions')
  }

  const handleCloseCreateSession = () => {
    setShowCreateSession(false)
  }

  return (
    <>
      <HomePage 
        onNewSession={handleNewSession} 
        onPreviousSessions={handlePreviousSessions}
      />
      {showCreateSession && (
        <CreateSession 
          onClose={handleCloseCreateSession}
          onSessionCreated={handleCreateSession}
        />
      )}
    </>
  )
}
