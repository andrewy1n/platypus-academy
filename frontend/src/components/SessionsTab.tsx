import React, { useState } from 'react';
import './SessionsTab.css';

// Types for session data
export interface SessionQuestion {
  id: string;
  content: string;
  type: 'multiple-choice' | 'free-response' | 'problem-solving';
  difficulty: 'easy' | 'medium' | 'hard';
  isCompleted: boolean;
  isCorrect?: boolean;
  pointsEarned?: number;
  maxPoints?: number;
  studentAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
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
  totalScore?: number;
  totalPoints?: number;
  pointsEarned?: number;
}

interface SessionsTabProps {
  sessions?: PracticeSession[];
  onResumeSession?: (sessionId: string) => void;
  onPreviewSession?: (sessionId: string) => void;
  onJumpToQuestion?: (sessionId: string, questionIndex: number) => void;
}

export default function SessionsTab({ 
  sessions = [], 
  onResumeSession, 
  onPreviewSession,
  onJumpToQuestion
}: SessionsTabProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Mock data for demonstration - replace with actual data from props
  const mockSessions: PracticeSession[] = sessions.length > 0 ? sessions : [
    {
      id: '1',
      title: 'Calculus Derivatives Review',
      subject: 'Mathematics',
      status: 'completed',
      progress: 100,
      totalQuestions: 6,
      completedQuestions: 6,
      totalScore: 50,
      totalPoints: 60,
      pointsEarned: 30,
      createdAt: new Date('2024-01-15'),
      lastAccessed: new Date('2024-01-20'),
      questions: [
        {
          id: 'q1',
          content: 'Find all critical points of the function f(x)=x³−6x²+9x',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 10,
          maxPoints: 10,
          studentAnswer: 'x = 1, x = 3',
          correctAnswer: 'x = 1, x = 3',
          explanation: 'Correct! You found both critical points by setting f\'(x) = 0.'
        },
        {
          id: 'q2',
          content: 'Differentiate the following function using the chain rule: f(x)=sin(3x²+1)',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 10,
          maxPoints: 10,
          studentAnswer: '6x cos(3x²+1)',
          correctAnswer: '6x cos(3x²+1)',
          explanation: 'Perfect! You correctly applied the chain rule by multiplying the derivative of the outer function by the derivative of the inner function.'
        },
        {
          id: 'q3',
          content: 'Compute the area under the curve f(x)=x² from x=1 to x=4 using definite integration.',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: 10,
          studentAnswer: '21',
          correctAnswer: '21',
          explanation: 'Check your calculation again. You should evaluate ∫₁⁴ x² dx = [x³/3]₁⁴ = 64/3 - 1/3 = 63/3 = 21.'
        },
        {
          id: 'q4',
          content: 'Find the derivative of f(x) = ln(x² + 1)',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: false,
          pointsEarned: 5,
          maxPoints: 10,
          studentAnswer: '1/(x² + 1)',
          correctAnswer: '2x/(x² + 1)',
          explanation: 'You forgot to multiply by the derivative of the inner function (x² + 1). The chain rule gives us: f\'(x) = (1/(x² + 1)) · 2x = 2x/(x² + 1).'
        },
        {
          id: 'q5',
          content: 'Determine if the function f(x) = x³ - 3x + 1 has any local extrema.',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: true,
          isCorrect: false,
          pointsEarned: 3,
          maxPoints: 10,
          studentAnswer: 'No local extrema',
          correctAnswer: 'Local minimum at x = 1, local maximum at x = -1',
          explanation: 'You need to find critical points by setting f\'(x) = 0. The derivative is 3x² - 3 = 3(x² - 1) = 3(x-1)(x+1), so x = 1 and x = -1 are critical points. Use the second derivative test to determine they are extrema.'
        },
        {
          id: 'q6',
          content: 'Find the equation of the tangent line to f(x) = x² at x = 2.',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 10,
          maxPoints: 10,
          studentAnswer: 'y = 4x - 4',
          correctAnswer: 'y = 4x - 4',
          explanation: 'Perfect! You correctly found the slope (4) and used point-slope form to get the tangent line equation.'
        }
      ]
    },
    {
      id: '2',
      title: 'Trigonometry Fundamentals',
      subject: 'Mathematics',
      status: 'in-progress',
      progress: 60,
      totalQuestions: 8,
      completedQuestions: 5,
      totalScore: 75,
      totalPoints: 40,
      pointsEarned: 30,
      createdAt: new Date('2024-01-18'),
      lastAccessed: new Date('2024-01-22'),
      questions: [
        {
          id: 'q1',
          content: 'Find the exact value of sin(π/6)',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 5,
          maxPoints: 5,
          studentAnswer: '1/2',
          correctAnswer: '1/2',
          explanation: 'Correct! sin(π/6) = sin(30°) = 1/2.'
        },
        {
          id: 'q2',
          content: 'Solve for x: cos(x) = 1/2',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 8,
          maxPoints: 8,
          studentAnswer: 'x = π/3 + 2πn, x = 5π/3 + 2πn',
          correctAnswer: 'x = π/3 + 2πn, x = 5π/3 + 2πn',
          explanation: 'Perfect! You found both solutions in the general form.'
        },
        {
          id: 'q3',
          content: 'Prove the identity: sin²(x) + cos²(x) = 1',
          type: 'free-response',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: false,
          pointsEarned: 4,
          maxPoints: 8,
          studentAnswer: 'Using Pythagorean theorem on unit circle',
          correctAnswer: 'This is the fundamental Pythagorean identity. On the unit circle, if (x,y) represents (cos θ, sin θ), then x² + y² = 1 by the Pythagorean theorem.',
          explanation: 'Your approach is correct, but you need to be more specific about how the unit circle relates to the trigonometric functions.'
        },
        {
          id: 'q4',
          content: 'Find the period of f(x) = 3sin(2x + π/4)',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 6,
          maxPoints: 6,
          studentAnswer: 'π',
          correctAnswer: 'π',
          explanation: 'Correct! The period of sin(2x) is 2π/2 = π.'
        },
        {
          id: 'q5',
          content: 'Evaluate tan(π/4)',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 5,
          maxPoints: 5,
          studentAnswer: '1',
          correctAnswer: '1',
          explanation: 'Correct! tan(π/4) = tan(45°) = 1.'
        },
        {
          id: 'q6',
          content: 'Find the amplitude of f(x) = 4cos(3x)',
          type: 'problem-solving',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q7',
          content: 'Solve: 2sin(x) = 1 for 0 ≤ x ≤ 2π',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        },
        {
          id: 'q8',
          content: 'Find the phase shift of f(x) = sin(x - π/3)',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        }
      ]
    },
    {
      id: '3',
      title: 'Physics Kinematics',
      subject: 'Physics',
      status: 'in-progress',
      progress: 50,
      totalQuestions: 8,
      completedQuestions: 4,
      totalScore: 80,
      totalPoints: 40,
      pointsEarned: 32,
      createdAt: new Date('2024-01-20'),
      lastAccessed: new Date('2024-01-22'),
      questions: [
        {
          id: 'q1',
          content: 'A car accelerates from rest at 2 m/s² for 10 seconds. What is its final velocity?',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 8,
          maxPoints: 8,
          studentAnswer: '20 m/s',
          correctAnswer: '20 m/s',
          explanation: 'Correct! Using v = v₀ + at, with v₀ = 0, a = 2 m/s², t = 10s, we get v = 20 m/s.'
        },
        {
          id: 'q2',
          content: 'An object is thrown upward with initial velocity 20 m/s. How high does it go?',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: true,
          isCorrect: false,
          pointsEarned: 6,
          maxPoints: 10,
          studentAnswer: '40 m',
          correctAnswer: '20.4 m',
          explanation: 'You used the wrong equation. Use v² = v₀² + 2as with v = 0 at the peak, v₀ = 20 m/s, a = -9.8 m/s².'
        },
        {
          id: 'q3',
          content: 'What is the acceleration due to gravity on Earth?',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 5,
          maxPoints: 5,
          studentAnswer: '9.8 m/s²',
          correctAnswer: '9.8 m/s²',
          explanation: 'Correct! The standard value for gravitational acceleration on Earth is 9.8 m/s².'
        },
        {
          id: 'q4',
          content: 'A ball is dropped from a height of 45m. How long does it take to hit the ground?',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: true,
          isCorrect: true,
          pointsEarned: 9,
          maxPoints: 9,
          studentAnswer: '3.03 seconds',
          correctAnswer: '3.03 seconds',
          explanation: 'Perfect! Using s = ½gt² with s = 45m and g = 9.8 m/s², we get t = 3.03s.'
        },
        {
          id: 'q5',
          content: 'A projectile is launched at 30° with initial speed 25 m/s. What is its horizontal range?',
          type: 'problem-solving',
          difficulty: 'hard',
          isCompleted: false
        },
        {
          id: 'q6',
          content: 'A train decelerates from 30 m/s to rest in 15 seconds. What is its acceleration?',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        },
        {
          id: 'q7',
          content: 'Which of the following is NOT a vector quantity?',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q8',
          content: 'A car travels 100m in 5 seconds, then 200m in 10 seconds. What is its average speed?',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        }
      ]
    },
    {
      id: '4',
      title: 'Organic Chemistry Reactions',
      subject: 'Chemistry',
      status: 'not-started',
      progress: 0,
      totalQuestions: 7,
      completedQuestions: 0,
      createdAt: new Date('2024-01-21'),
      lastAccessed: new Date('2024-01-21'),
      questions: [
        {
          id: 'q1',
          content: 'What type of reaction occurs when an alkene reacts with H₂ in the presence of a catalyst?',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q2',
          content: 'Draw the mechanism for the SN2 reaction between CH₃Br and OH⁻.',
          type: 'free-response',
          difficulty: 'hard',
          isCompleted: false
        },
        {
          id: 'q3',
          content: 'Which functional group is present in aldehydes?',
          type: 'multiple-choice',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q4',
          content: 'Predict the product of the reaction between 2-methyl-2-butene and HCl.',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        },
        {
          id: 'q5',
          content: 'What is the IUPAC name for CH₃CH₂CH₂OH?',
          type: 'problem-solving',
          difficulty: 'easy',
          isCompleted: false
        },
        {
          id: 'q6',
          content: 'Explain why tertiary alcohols are more stable than primary alcohols.',
          type: 'free-response',
          difficulty: 'medium',
          isCompleted: false
        },
        {
          id: 'q7',
          content: 'What is the major product when benzene reacts with Cl₂ in the presence of FeCl₃?',
          type: 'problem-solving',
          difficulty: 'medium',
          isCompleted: false
        }
      ]
    }
  ];

  const handleToggleExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
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
                              } ${question.isCorrect === false ? 'incorrect' : ''}`}
                              onClick={() => onJumpToQuestion?.(session.id, index)}
                              title={question.isCompleted ? 
                                `${question.isCorrect ? 'Correct' : 'Incorrect'} - ${question.pointsEarned}/${question.maxPoints} points` : 
                                'Click to jump to this question'
                              }
                            >
                              <div className="question-number">{index + 1}</div>
                              <div className="question-status">
                                {index < session.completedQuestions ? (
                                  <span className={`status-completed ${question.isCorrect === false ? 'incorrect' : ''}`}>
                                    {question.isCorrect === false ? '✗ Wrong' : '✓ Correct'}
                                  </span>
                                ) : index === session.completedQuestions ? (
                                  <span className="status-current">→ Next</span>
                                ) : (
                                  <span className="status-pending">○ Pending</span>
                                )}
                              </div>
                              {question.isCompleted && question.pointsEarned !== undefined && (
                                <div className="question-score">
                                  {question.pointsEarned}/{question.maxPoints}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {session.status === 'completed' && (
                  <div className="session-summary">
                    <div className="summary-header">
                      <h3 className="summary-title">Session Complete!</h3>
                      <div className="summary-score">
                        <span className="score-percentage">{session.totalScore}%</span>
                        <span className="score-details">{session.pointsEarned}/{session.totalPoints} points</span>
                      </div>
                    </div>
                    <div className="summary-breakdown">
                      <div className="breakdown-item">
                        <span className="breakdown-label">Correct Answers</span>
                        <span className="breakdown-value">
                          {session.questions.filter(q => q.isCorrect === true).length}/{session.totalQuestions}
                        </span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Incorrect Answers</span>
                        <span className="breakdown-value">
                          {session.questions.filter(q => q.isCorrect === false).length}/{session.totalQuestions}
                        </span>
                      </div>
                    </div>
                    
                    {/* Question List for Completed Sessions */}
                    <div className="completed-questions-list">
                      <h4 className="questions-list-title">Question Results</h4>
                      <div className="questions-grid">
                        {session.questions.map((question, index) => (
                          <div 
                            key={question.id} 
                            className={`question-result-card ${question.isCorrect ? 'correct' : 'incorrect'}`}
                          >
                            <div 
                              className="question-card-header"
                              onClick={() => {
                                const card = document.querySelector(`[data-question-card="${question.id}"]`);
                                const toggle = document.querySelector(`[data-toggle="${question.id}"]`);
                                if (card && toggle) {
                                  card.classList.toggle('collapsed');
                                  toggle.classList.toggle('rotated');
                                }
                              }}
                            >
                              <div className="question-header-left">
                                <span className="question-result-number">{index + 1}</span>
                                <span className={`question-result-status ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                                  {question.isCorrect ? '✓' : '✗'}
                                </span>
                                <span className="question-result-score">
                                  {question.pointsEarned}/{question.maxPoints} pts
                                </span>
                              </div>
                              <button className="question-card-toggle" data-toggle={question.id}>
                                ▼
                              </button>
                            </div>
                            
                            {/* Collapsible Question Content */}
                            <div className="question-card-content" data-question-card={question.id}>
                              <div className="question-content-main">
                                <p className="question-result-text">{question.content}</p>
                              </div>
                              
                              <div className="question-details">
                                <div className="detail-section">
                                  <strong>Your Answer:</strong> {question.studentAnswer}
                                </div>
                                <div className="detail-section">
                                  <strong>Correct Answer:</strong> {question.correctAnswer}
                                </div>
                                {question.explanation && (
                                  <div className="detail-section explanation">
                                    <strong>Explanation:</strong> {question.explanation}
                                  </div>
                                )}
                                <div className="detail-actions">
                                  <button 
                                    className="jump-to-question-btn"
                                    onClick={() => onJumpToQuestion?.(session.id, index)}
                                  >
                                    Jump to Question
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
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
                  {session.status === 'completed' ? 'Review Session' : session.status === 'in-progress' ? 'Continue Practice' : 'Start Practice'}
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
