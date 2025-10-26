import React from 'react';
import { Question } from './QuestionRenderer';
import './EndSummary.css';

interface QuestionWithAnswer extends Question {
  userAnswer?: any;
}

interface EndSummaryProps {
  questions: QuestionWithAnswer[];
  onBackToHome?: () => void;
}

// Helper function to format answers for display
const formatAnswer = (answer: any): string => {
  if (answer === null || answer === undefined) {
    return 'No answer provided';
  }
  
  // Handle array answers (ordering questions)
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }
  
  // Handle object answers (matching questions)
  if (typeof answer === 'object') {
    const pairs = Object.entries(answer).map(([key, value]) => `${key} → ${value}`);
    return pairs.join(', ');
  }
  
  // Handle string and number answers
  if (typeof answer === 'string' || typeof answer === 'number') {
    return String(answer);
  }
  
  return 'Unknown format';
};

const EndSummary: React.FC<EndSummaryProps> = ({ questions, onBackToHome }) => {
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

              return (
                <div key={question.id || index} className={`question-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-number">Question {question.problemNumber}</span>
                    <span className={`question-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  <p className="question-text">{question.questionText}</p>
                  
                  <div className="answer-section">
                    <div className="answer-item">
                      <strong>Your Answer:</strong>
                      <span>{formatAnswer(question.userAnswer)}</span>
                    </div>
                    <div className="answer-item">
                      <strong>Correct Answer:</strong>
                      <span>{formatAnswer(question.correctAnswer)}</span>
                    </div>
                  </div>

                  {question.explanation && (
                    <div className="explanation">
                      <strong>Explanation:</strong>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {onBackToHome && (
            <div className="summary-actions">
              <button className="back-button" onClick={onBackToHome}>
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EndSummary;
