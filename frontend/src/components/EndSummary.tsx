import React, { useState, useEffect } from 'react';
import { Question } from './QuestionRenderer';
import { formatMathExpression, formatMathAnswer } from '../utils/mathFormatter';
import './EndSummary.css';

interface QuestionWithAnswer extends Question {
  userAnswer?: any;
}

interface EndSummaryProps {
  questions: QuestionWithAnswer[];
  onBackToHome?: () => void;
}

// Use the mathematical formatter for answers
const formatAnswer = formatMathAnswer;

const EndSummary: React.FC<EndSummaryProps> = ({ questions, onBackToHome }) => {
  // State for tracking which questions are collapsed/expanded
  // Initialize with all questions collapsed by default
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());

  // Set all questions as collapsed when component mounts
  useEffect(() => {
    const allQuestionIds = new Set<string>();
    questions.forEach((question, index) => {
      const questionId = question.id || `question-${index}`;
      allQuestionIds.add(questionId);
    });
    setCollapsedQuestions(allQuestionIds);
  }, [questions]);

  // Toggle question collapse state
  const toggleQuestion = (questionId: string) => {
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };
  // Calculate statistics
  const totalQuestions = questions.length;
  const correctAnswers = questions.filter((q, index) => {
    const userAnswer = q.userAnswer;
    const correctAnswer = q.correctAnswer;
    
    // Handle different answer types
    if (Array.isArray(correctAnswer)) {
      // For ordering questions, compare arrays
      if (Array.isArray(userAnswer)) {
        return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
      }
      return false;
    }
    
    if (typeof correctAnswer === 'object' && correctAnswer !== null) {
      // For matching questions, compare objects
      if (typeof userAnswer === 'object' && userAnswer !== null) {
        return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
      }
      return false;
    }
    
    // Simple string/number comparison
    return String(userAnswer) === String(correctAnswer);
  }).length;
  
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  return (
    <div className="end-summary">
      <div className="summary-container">
        <div className="summary-content">
          {/* Header */}
          <div className="summary-header">
            <h1 className="summary-title">Practice Session Complete!</h1>
            <p className="summary-subtitle">
              You scored <span className="highlighted-score">{score}%</span> (
              {correctAnswers} of {totalQuestions} correct)
            </p>
          </div>

          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-bars">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <div className="progress-stats">
              <span className="score-text">Score: {score}%</span>
              <span className="score-text">{correctAnswers}/{totalQuestions} Correct</span>
            </div>
          </div>

          {/* Questions Review */}
          <div className="questions-section">
            <h2 className="section-title">Question Review</h2>
            {questions.map((question, index) => {
              const isCorrect = (() => {
                const userAnswer = question.userAnswer;
                const correctAnswer = question.correctAnswer;
                
                if (Array.isArray(correctAnswer)) {
                  if (Array.isArray(userAnswer)) {
                    return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
                  }
                  return false;
                }
                
                if (typeof correctAnswer === 'object' && correctAnswer !== null) {
                  if (typeof userAnswer === 'object' && userAnswer !== null) {
                    return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
                  }
                  return false;
                }
                
                return String(userAnswer) === String(correctAnswer);
              })();

              const questionId = question.id || `question-${index}`;
              const isCollapsed = collapsedQuestions.has(questionId);

              return (
                <div key={questionId} className={`question-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header" onClick={() => toggleQuestion(questionId)}>
                    <div className="question-header-left">
                      <span className={`collapse-triangle ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                        ▼
                      </span>
                      <span className="question-number">Question {question.problemNumber}</span>
                    </div>
                    <span className={`question-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="question-content">
                      <p className="question-text">{formatMathExpression(question.questionText)}</p>
                      
                      <div className="answer-section">
                        <div className="answer-item">
                          <div className="answer-label">Your Answer:</div>
                          <div className="answer-value">{formatAnswer(question.userAnswer)}</div>
                        </div>
                        <div className="answer-item">
                          <div className="answer-label">Correct Answer:</div>
                          <div className="answer-value">{formatAnswer(question.correctAnswer)}</div>
                        </div>
                      </div>

                      {question.explanation && (
                        <div className="explanation">
                          <strong>Explanation:</strong>
                          <p>{formatMathExpression(question.explanation)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {onBackToHome && (
            <div className="action-buttons">
              <button className="back-button" onClick={onBackToHome}>
                <span className="home-icon">🏠</span>
                <span className="button-text">Back to Home</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EndSummary;
