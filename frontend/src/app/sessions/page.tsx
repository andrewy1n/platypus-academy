'use client'

import { useRouter } from 'next/navigation'
import SessionsTab from '../../components/SessionsTab'

export default function SessionsPage() {
  const router = useRouter()

  const handleResumeSession = (sessionId: string) => {
    // Navigate to the practice session
    router.push(`/practice/${sessionId}`)
  }

  const handlePreviewSession = (sessionId: string) => {
    // For now, just log - could open a modal or navigate to preview
    console.log('Preview session:', sessionId)
  }

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
          onResumeSession={handleResumeSession}
          onPreviewSession={handlePreviewSession}
        />
      </div>
    </div>
  )
}
