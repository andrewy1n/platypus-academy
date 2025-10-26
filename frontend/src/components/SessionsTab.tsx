import React, { useState } from 'react';
import './SessionsTab.css';

// Types for session data
export interface SessionQuestion {
  id: string;
  content: string;
  type: 'multiple-choice' | 'free-response' | 'problem-solving';
  difficulty: 'easy' | 'medium' | 'hard';
  isCompleted: boolean;
  previewImage?: string;
}

export interface PracticeSession {
  id: string;
  title: string;
  subject: string;
  status: 'in-progress' | 'completed' | 'not-started';
  progress: number; // percentage 0-100
  totalQuestions: number;
  completedQuestions: number;
  questions: SessionQuestion[];
  createdAt: Date;
  lastAccessed: Date;
  source?: string; // e.g., "Created from Calculus.jpeg"
}

interface SessionsTabProps {
  sessions?: PracticeSession[];
  onResumeSession?: (sessionId: string) => void;
  onPreviewSession?: (sessionId: string) => void;
}

export default function SessionsTab({ 
  sessions = [], 
  onResumeSession, 
  onPreviewSession 
}: SessionsTabProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [previewSession, setPreviewSession] = useState<string | null>(null);

  // Mock data for demonstration - replace with actual data from props
  const mockSessions: PracticeSession[] = sessions.length > 0 ? sessions : [
    {
      id: '1',
      title: 'Calculus Review',
      subject: 'Mathematics',
      status: 'in-progress',
      progress: 75,
      totalQuestions: 5,
      completedQuestions: 3,
      source: 'Created from Calculus.jpeg',
      createdAt: new Date('2024-01-15'),
      lastAccessed: new Date('2024-01-20'),
      questions: [
        {
          id: 'q1',
          content: 'Find all critical points of the function f(x)=x³−6x²+9x',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          previewImage: 'http://localhost:3845/assets/5808d56324cc366e87ee05bf8550f7db2cc314b4.png'
        },
        {
          id: 'q2',
          content: 'Differentiate the following function using the chain rule: f(x)=sin(3x²+1)',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: true,
          previewImage: 'http://localhost:3845/assets/5808d56324cc366e87ee05bf8550f7db2cc314b4.png'
        },
        {
          id: 'q3',
          content: 'Compute the area under the curve f(x)=x² from x=1 to x=4 using definite integration.',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          previewImage: 'http://localhost:3845/assets/5808d56324cc366e87ee05bf8550f7db2cc314b4.png'
        },
        {
          id: 'q4',
          content: 'Differentiate the following function using the chain rule: f(x)=sin(3x²+1)',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: false,
          previewImage: 'http://localhost:3845/assets/5808d56324cc366e87ee05bf8550f7db2cc314b4.png'
        },
        {
          id: 'q5',
          content: 'Differentiate the following function using the chain rule: f(x)=sin(3x²+1)',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: false,
          previewImage: 'http://localhost:3845/assets/5808d56324cc366e87ee05bf8550f7db2cc314b4.png'
        }
      ]
    },
    {
      id: '2',
      title: 'Trigonometry Review',
      subject: 'Mathematics',
      status: 'not-started',
      progress: 0,
      totalQuestions: 8,
      completedQuestions: 0,
      createdAt: new Date('2024-01-18'),
      lastAccessed: new Date('2024-01-18'),
      questions: [
        {
          id: 'q1',
          content: 'Find the exact value of sin(π/6)',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q2',
          content: 'Solve for x: cos(x) = 1/2',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        }
      ]
    }
  ];

  const handleTogglePreview = (sessionId: string) => {
    if (previewSession === sessionId) {
      setPreviewSession(null);
    } else {
      setPreviewSession(sessionId);
      setExpandedSession(null); // Close any expanded session
    }
  };

  const handleToggleExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      setPreviewSession(null); // Close any preview
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return '#3b82f6';
      case 'completed':
        return '#059669';
      case 'not-started':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'not-started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="sessions-tab">
      <div className="sessions-tab-content">
        <div className="sessions-header">
          <h1 className="sessions-welcome">Welcome back Andrew!</h1>
          <p className="sessions-subtitle">Here are your recent sessions:</p>
        </div>

        <div className="sessions-list">
          {mockSessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-title-section">
                  <h2 className="session-title">{session.title}</h2>
                  <div 
                    className="session-status-badge"
                    style={{ backgroundColor: `${getStatusColor(session.status)}1a` }}
                  >
                    <span 
                      className="session-status-text"
                      style={{ color: getStatusColor(session.status) }}
                    >
                      {getStatusText(session.status)}
                    </span>
                  </div>
                </div>
                
                {session.source && (
                  <p className="session-source">{session.source}</p>
                )}
                
                {session.status === 'in-progress' && (
                  <div className="session-progress">
                    {/* Time-based progress with meaningful info */}
                    <div className="progress-summary">
                      <div className="progress-stats">
                        <div className="stat-item">
                          <span className="stat-number">{session.completedQuestions}</span>
                          <span className="stat-label">Completed</span>
                        </div>
                        <div className="stat-divider">•</div>
                        <div className="stat-item">
                          <span className="stat-number">{session.totalQuestions - session.completedQuestions}</span>
                          <span className="stat-label">Remaining</span>
                        </div>
                        <div className="stat-divider">•</div>
                        <div className="stat-item">
                          <span className="stat-number">~{Math.ceil((session.totalQuestions - session.completedQuestions) * 3)}</span>
                          <span className="stat-label">min left</span>
                        </div>
                      </div>
                      
                      {/* Visual question flow */}
                      <div className="question-flow">
                        <div className="flow-header">
                          <span className="flow-title">Question Flow</span>
                          <span className="flow-subtitle">Click to jump to any question</span>
                        </div>
                        <div className="flow-questions">
                          {session.questions.map((question, index) => (
                            <div 
                              key={question.id}
                              className={`flow-question ${
                                index < session.completedQuestions ? 'completed' : 
                                index === session.completedQuestions ? 'current' : 'pending'
                              }`}
                              onClick={() => console.log(`Jump to question ${index + 1}`)}
                            >
                              <div className="question-number">{index + 1}</div>
                              <div className="question-status">
                                {index < session.completedQuestions ? (
                                  <span className="status-completed">✓ Done</span>
                                ) : index === session.completedQuestions ? (
                                  <span className="status-current">→ Next</span>
                                ) : (
                                  <span className="status-pending">○ Pending</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {session.status === 'not-started' && (
                  <p className="session-ready">Questions ready - Start when you're ready!</p>
                )}
              </div>

              <div className="session-actions">
                <button 
                  className="session-btn resume-btn"
                  onClick={() => onResumeSession?.(session.id)}
                >
                  Resume
                </button>
                <button 
                  className="session-btn preview-btn"
                  onClick={() => handleTogglePreview(session.id)}
                >
                  {previewSession === session.id ? 'Close Preview' : 'Preview Questions'}
                  {previewSession === session.id ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9.88 9.88L14.12 14.12M14.12 9.88L9.88 14.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Preview Questions Section */}
              {previewSession === session.id && (
                <div className="session-preview">
                  <h3 className="preview-title">Preview Questions</h3>
                  <div className="questions-list">
                    {session.questions.map((question, index) => (
                      <div key={question.id} className="question-preview">
                        <div className="question-number">
                          {index + 1}.)
                        </div>
                        <div className="question-content">
                          <p className="question-text">{question.content}</p>
                          {question.previewImage && (
                            <img 
                              src={question.previewImage} 
                              alt="Question preview"
                              className="question-preview-image"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
