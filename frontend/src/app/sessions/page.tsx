'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userService } from '../../services/userService'
import { sessionService } from '../../services/sessionService'
import SessionsTab from '../../components/SessionsTab'

export default function SessionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionData, setSessionData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleResumeSession = (sessionId: string) => {
    // Navigate to the practice session
    router.push(`/practice/${sessionId}`)
  }

  const handleJumpToQuestion = (sessionId: string, questionIndex: number) => {
    // Navigate to the practice session with a specific question
    router.push(`/practice/${sessionId}?question=${questionIndex}`)
  }

  const handlePreviewSession = (sessionId: string) => {
    // For now, just log - could open a modal or navigate to preview
    console.log('Preview session:', sessionId)
  }

  // Load user sessions and their data
  useEffect(() => {
    const loadSessions = async () => {
      if (user?.session_ids && user.session_ids.length > 0) {
        try {
          // Use session_ids directly from user object
          const sessionPromises = user.session_ids.map(async (id: string) => {
            try {
              const session = await sessionService.getSession(id)
              return { id, ...session }
            } catch (error) {
              console.error(`Error loading session ${id}:`, error)
              return null
            }
          })
          
          const sessions = (await Promise.all(sessionPromises)).filter(Boolean)
          setSessionData(sessions as any[])
        } catch (error) {
          console.error('Error loading sessions:', error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    
    loadSessions()
  }, [user])

  // Map session data to SessionsTab format
  const sessions = sessionData.map(session => ({
    id: session.id,
    title: session.title || `${session.subject} Practice`,
    subject: session.subject,
    status: session.status || 'in-progress' as const,
    progress: session.num_questions > 0 
      ? Math.round((session.num_questions_answered / session.num_questions) * 100) 
      : 0,
    totalQuestions: session.num_questions || 0,
    completedQuestions: session.num_questions_answered || 0,
    questions: (session.questions || []).map((qId: string, idx: number) => ({
      id: qId,
      content: `Question ${idx + 1}`,
      type: 'problem-solving' as const,
      difficulty: 'medium' as const,
      isCompleted: idx < (session.num_questions_answered || 0)
    })),
    createdAt: new Date(session.created_at),
    lastAccessed: new Date()
  }))

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #a8e6cf 0%, #88d8a3 30%, #7fcdcd 70%, #b8e6b8 100%)',
      padding: '2rem 0'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 2rem',
        position: 'relative'
      }}>
        {/* Back button */}
        <button
          onClick={() => router.push('/home')}
          style={{
            position: 'absolute',
            top: '-1rem',
            left: '2rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
          }}
        >
          ← Back to Home
        </button>

        {/* Sessions Tab with proper styling */}
        <SessionsTab 
          sessions={[]} // Always use mock data for demonstration
          onResumeSession={handleResumeSession}
          onPreviewSession={handlePreviewSession}
          onJumpToQuestion={handleJumpToQuestion}
        />
      </div>
    </div>
  )
}
