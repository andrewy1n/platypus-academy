'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import PracticeWithChat from '../../../components/PracticeWithChat'
import QuestionRenderer, { Question } from '../../../components/QuestionRenderer'
import EndSummary from '../../../components/EndSummary'
import './page.css'

interface PracticePageProps {
  params: {
    sessionId: string
  }
}

export default function PracticePage({ params }: PracticePageProps) {
  const router = useRouter()
  const { sessionId } = params
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Mock questions data - replace with actual API call
  useEffect(() => {
    const mockQuestions: Question[] = [
      {
        id: '1',
        problemNumber: 1,
        questionText: 'What is the derivative of x²?',
        questionType: 'mcq',
        correctAnswer: '2x',
        choices: ['2x', 'x', '2', 'x²'],
        explanation: 'Using the power rule, the derivative of x² is 2x.'
      },
      {
        id: '2', 
        problemNumber: 2,
        questionText: 'The derivative of a constant is zero.',
        questionType: 'tf',
        correctAnswer: true,
        explanation: 'The derivative of any constant is indeed zero.'
      },
      {
        id: '3',
        problemNumber: 3,
        questionText: 'What is the area of a circle with radius 5?',
        questionType: 'numeric',
        correctAnswer: 78.54,
        explanation: 'The area of a circle is πr². With radius 5, the area is π(5)² = 25π ≈ 78.54.'
      },
      {
        id: '4',
        problemNumber: 4,
        questionText: 'The integral of 2x with respect to x is ____.',
        questionType: 'fib',
        correctAnswer: 'x² + C',
        explanation: 'The integral of 2x is x² + C, where C is the constant of integration.'
      },
      {
        id: '5',
        problemNumber: 5,
        questionText: 'Match the following derivatives:',
        questionType: 'matching',
        correctAnswer: { 'x²': '2x', 'sin(x)': 'cos(x)', 'e^x': 'e^x' },
        left: ['x²', 'sin(x)', 'e^x'],
        right: ['2x', 'cos(x)', 'e^x'],
        explanation: 'These are fundamental derivative rules in calculus.'
      },
      {
        id: '6',
        problemNumber: 6,
        questionText: 'Order the following steps to solve 2x + 3 = 7:',
        questionType: 'ordering',
        correctAnswer: ['Subtract 3 from both sides', 'Divide by 2', 'x = 2'],
        choices: ['Subtract 3 from both sides', 'Divide by 2', 'x = 2'],
        explanation: 'First subtract 3, then divide by 2 to isolate x.'
      },
      {
        id: '7',
        problemNumber: 7,
        questionText: 'Explain the chain rule in calculus and provide an example.',
        questionType: 'fr',
        correctAnswer: 'The chain rule states that the derivative of a composite function is the product of the derivatives of the outer and inner functions.',
        points: 10,
        explanation: 'The chain rule is fundamental for finding derivatives of composite functions.'
      }
    ]
    
    setQuestions(mockQuestions)
    setIsLoading(false)
  }, [])

  const handleAnswerChange = (answer: any) => {
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion) {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id!]: answer
      }))
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // All questions completed
      setIsCompleted(true)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleBackToHome = () => {
    router.push('/home')
  }

  if (isLoading) {
    return (
      <div className="practice-loading">
        <div className="loading-spinner"></div>
        <p>Loading practice session...</p>
      </div>
    )
  }

  if (isCompleted) {
    // Show end summary with user answers
    const questionsWithAnswers = questions.map(q => ({
      ...q,
      userAnswer: userAnswers[q.id!]
    }))
    
    return (
      <PracticeWithChat practiceSessionId={sessionId} isActive={false}>
        <EndSummary 
          questions={questionsWithAnswers} 
          onBackToHome={handleBackToHome}
        />
      </PracticeWithChat>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id!] : undefined

  return (
    <PracticeWithChat practiceSessionId={sessionId} isActive={true}>
      <div className="practice-page">
        <div className="practice-container">
          <div className="practice-header">
            <h1 className="practice-title">Practice Session</h1>
            <div className="progress-info">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="practice-content">
            {currentQuestion && (
              <QuestionRenderer
                question={currentQuestion}
                userAnswer={currentAnswer}
                onAnswerChange={handleAnswerChange}
                isSubmitted={false}
                showCorrectAnswer={false}
              />
            )}

            <div className="practice-navigation">
              <button 
                className="nav-button prev-button"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </button>
              
              <div className="question-indicators">
                {questions.map((_, index) => (
                  <div 
                    key={index}
                    className={`indicator ${
                      index === currentQuestionIndex ? 'current' : 
                      index < currentQuestionIndex ? 'completed' : 'pending'
                    }`}
                  />
                ))}
              </div>

              <button 
                className="nav-button next-button"
                onClick={handleNextQuestion}
                disabled={!currentAnswer}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PracticeWithChat>
  )
}