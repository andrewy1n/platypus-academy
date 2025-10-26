'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import PracticeWithChat from '../../../components/PracticeWithChat'
import QuestionRenderer, { Question } from '../../../components/QuestionRenderer'
import EndSummary from '../../../components/EndSummary'
import { sessionService } from '../../../services/sessionService'
import { questionService } from '../../../services/questionService'
import { gradingService } from '../../../services/gradingService'
import { getMockQuestions } from '../../../services/mockQuestionService'
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

  // Load questions from backend
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Check if this is a mock session
        if (sessionId.startsWith('mock-session-')) {
          const mockQuestions = getMockQuestions(sessionId)
          setQuestions(mockQuestions)
          setIsLoading(false)
          return
        }
        
        const response = await sessionService.getSessionQuestions(sessionId)
        
        // Handle different response structures
        const backendQuestions = Array.isArray(response) ? response : response.questions || []
        
        if (!Array.isArray(backendQuestions)) {
          console.error('Expected array but got:', backendQuestions)
          setQuestions([])
          setIsLoading(false)
          return
        }
        
        // Map backend questions to UI format
        const mappedQuestions: Question[] = backendQuestions.map((q: any, index: number) => {
          const typeMap: { [key: string]: string } = { 
            short_answer: 'fr' 
          };
          
          const questionType = typeMap[q.question.data.type] || q.question.data.type;
          
                     // Extract question data based on type
           let correctAnswer: any = null;
           let choices: string[] | undefined;
           let left: string[] | undefined;
           let right: string[] | undefined;
           let points: number | undefined;
           let rubric: string | undefined;
           let imageUrl: string | undefined;
           
           // Handle case where data might be in different structure
           const questionData = q.question?.data || q.data || q;
           const questionText = q.question?.text || q.text || '';
           
           if (!questionData) {
             console.warn('Missing question data:', q)
             return {
               id: q.id || `q-${index}`,
               problemNumber: index + 1,
               questionText: questionText || 'Question text not available',
               questionType: 'mcq' as any,
               correctAnswer: '',
               choices: []
             }
           }
           
           switch (questionData.type) {
                         case 'mcq':
               correctAnswer = questionData.answer;
               choices = questionData.choices;
               break;
             case 'tf':
               correctAnswer = questionData.answer;
               break;
             case 'numeric':
               correctAnswer = questionData.answer;
               break;
             case 'fib':
               correctAnswer = questionData.answer;
               break;
             case 'matching':
               correctAnswer = questionData.answer;
               left = questionData.left;
               right = questionData.right;
               break;
             case 'ordering':
               correctAnswer = questionData.answer;
               choices = questionData.choices;
               break;
             case 'short_answer':
             case 'fr':
               points = q.points || questionData.points;
               rubric = questionData.rubric;
               correctAnswer = questionData.answer;
               break;
          }
          
          // Get image URL if available
          if (q.question?.image_url) {
            imageUrl = q.question.image_url;
          }
          
          return {
            id: q.id,
            problemNumber: index + 1,
            questionText: questionText,
            questionType: questionType as any,
            correctAnswer,
            choices,
            left,
            right,
            points,
            rubric,
            imageUrl,
            explanation: questionData.rubric || undefined
          };
        });
        
        setQuestions(mappedQuestions)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading questions:', error)
        setIsLoading(false)
      }
    }
    
    loadQuestions()
  }, [sessionId])

  const handleAnswerChange = (answer: any) => {
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion) {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id!]: answer
      }))
    }
  }

  const handleNextQuestion = async () => {
    const currentQuestion = questions[currentQuestionIndex]
    const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id!] : undefined
    
    // Save answer before advancing (skip for mock sessions)
    if (currentQuestion && currentAnswer !== undefined && !sessionId.startsWith('mock-session-')) {
      try {
        await questionService.saveAnswer(currentQuestion.id!, { answer: currentAnswer })
        
        // If it's a free response question, trigger grading
        if (currentQuestion.questionType === 'fr') {
          await gradingService.gradeFreeResponse(currentQuestion.id!, (data) => {
            // Progress updates from grading can be shown here if needed
            console.log('Grading progress:', data)
          })
        }
      } catch (error) {
        console.error('Error saving/grading answer:', error)
      }
    }
    
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