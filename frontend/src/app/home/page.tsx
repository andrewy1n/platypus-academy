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

  const handleCreateSession = (sessionData: any) => {
    // Navigate to practice session with the session data
    const sessionId = `session-${Date.now()}`
    router.push(`/practice/${sessionId}?type=${sessionData.type}&subject=${sessionData.subject}`)
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
