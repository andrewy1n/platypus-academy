import React, { useState, useEffect } from 'react';
import './QuestionRenderer.css';

// Question Types based on backend models
export type QuestionType = 'mcq' | 'tf' | 'numeric' | 'fib' | 'matching' | 'ordering' | 'fr';

export interface Question {
  id?: string;
  problemNumber?: number;
  questionText: string;
  questionType: QuestionType;
  correctAnswer: any;
  explanation?: string;
  // Question type specific data
  choices?: string[]; // For MCQ and Ordering
  left?: string[]; // For Matching
  right?: string[]; // For Matching
  points?: number; // For FR
  rubric?: string; // For FR
  imageUrl?: string;
}

interface QuestionRendererProps {
  question: Question;
  userAnswer?: any;
  onAnswerChange?: (answer: any) => void;
  isSubmitted?: boolean;
  showCorrectAnswer?: boolean;
  onCheckAnswer?: (isCorrect: boolean) => void;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  userAnswer,
  onAnswerChange,
  isSubmitted = false,
  showCorrectAnswer = false,
  onCheckAnswer
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [matchingAnswers, setMatchingAnswers] = useState<{[key: string]: string}>(userAnswer || {});
  const [orderedItems, setOrderedItems] = useState<string[]>(userAnswer || question.choices || []);

  // Sync state when userAnswer prop changes
  useEffect(() => {
    if (question.questionType === 'matching' && userAnswer) {
      setMatchingAnswers(userAnswer);
    }
  }, [userAnswer, question.questionType]);

  useEffect(() => {
    if (question.questionType === 'ordering' && userAnswer) {
      setOrderedItems(userAnswer);
    }
  }, [userAnswer, question.questionType]);

  // Reset check state when question changes
  useEffect(() => {
    setIsChecked(false);
    setIsCorrect(null);
  }, [question.id]);

  const handleAnswerChange = (answer: any) => {
    if (onAnswerChange) {
      onAnswerChange(answer);
    }
    // Reset check state when answer changes
    if (isChecked) {
      setIsChecked(false);
      setIsCorrect(null);
    }
  };

  const checkAnswer = () => {
    if (!userAnswer) return;
    
    let correct = false;
    
    switch (question.questionType) {
      case 'mcq':
        correct = userAnswer === question.correctAnswer;
        break;
      case 'tf':
        correct = userAnswer === question.correctAnswer;
        break;
      case 'numeric':
        correct = Math.abs(parseFloat(userAnswer) - parseFloat(question.correctAnswer)) < 0.01;
        break;
      case 'fib':
        correct = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        break;
      case 'matching':
        correct = JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
        break;
      case 'ordering':
        correct = JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
        break;
      case 'fr':
        // For free response, we'll assume correct for now (would need AI grading)
        correct = true;
        break;
      default:
        correct = false;
    }
    
    setIsCorrect(correct);
    setIsChecked(true);
    
    if (onCheckAnswer) {
      onCheckAnswer(correct);
    }
  };

  const renderMCQ = () => (
    <div className="question-answer-section">
      <div className="mcq-options">
        {question.choices?.map((choice, index) => (
          <label key={index} className="mcq-option">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={choice}
              checked={userAnswer === choice}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={isSubmitted}
            />
            <span className="option-text">{choice}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderTF = () => (
    <div className="question-answer-section">
      <div className="tf-options">
        <label className="tf-option">
          <input
            type="radio"
            name={`question-${question.id}`}
            value="true"
            checked={userAnswer === true}
            onChange={() => handleAnswerChange(true)}
            disabled={isSubmitted}
          />
          <span className="option-text">True</span>
        </label>
        <label className="tf-option">
          <input
            type="radio"
            name={`question-${question.id}`}
            value="false"
            checked={userAnswer === false}
            onChange={() => handleAnswerChange(false)}
            disabled={isSubmitted}
          />
          <span className="option-text">False</span>
        </label>
      </div>
    </div>
  );

  const renderNumeric = () => (
    <div className="question-answer-section">
      <input
        type="number"
        className="numeric-input"
        placeholder="Enter a number"
        value={userAnswer || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
        disabled={isSubmitted}
        step="any"
      />
    </div>
  );

  const renderFIB = () => (
    <div className="question-answer-section">
      <input
        type="text"
        className="fib-input"
        placeholder="Fill in the blank"
        value={userAnswer || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
        disabled={isSubmitted}
      />
    </div>
  );

  const renderMatching = () => {
    const handleMatchingChange = (left: string, right: string) => {
      const newAnswers = { ...matchingAnswers, [left]: right };
      setMatchingAnswers(newAnswers);
      handleAnswerChange(newAnswers);
    };

    return (
      <div className="question-answer-section">
        <div className="matching-container">
          <div className="matching-left">
            {question.left?.map((item, index) => (
              <div key={index} className="matching-item">
                <span className="matching-label">{item}</span>
                <select
                  className="matching-select"
                  value={matchingAnswers[item] || ''}
                  onChange={(e) => handleMatchingChange(item, e.target.value)}
                  disabled={isSubmitted}
                >
                  <option value="">Select...</option>
                  {question.right?.map((option, optIndex) => (
                    <option key={optIndex} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderOrdering = () => {
    const moveItem = (fromIndex: number, toIndex: number) => {
      const newOrder = [...orderedItems];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      setOrderedItems(newOrder);
      handleAnswerChange(newOrder);
    };

    return (
      <div className="question-answer-section">
        <div className="ordering-container">
          <p className="ordering-instruction">Drag to reorder the items:</p>
          <div className="ordering-list">
            {orderedItems.map((item, index) => (
              <div key={index} className="ordering-item">
                <span className="ordering-number">{index + 1}.</span>
                <span className="ordering-text">{item}</span>
                <div className="ordering-controls">
                  <button
                    type="button"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0 || isSubmitted}
                    className="ordering-btn"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === orderedItems.length - 1 || isSubmitted}
                    className="ordering-btn"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFR = () => (
    <div className="question-answer-section">
      <textarea
        className="fr-input"
        placeholder="Enter your detailed response..."
        value={userAnswer || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
        disabled={isSubmitted}
        rows={6}
      />
      {question.points && (
        <div className="fr-info">
          <span className="fr-points">Points: {question.points}</span>
        </div>
      )}
    </div>
  );

  const renderQuestionType = () => {
    switch (question.questionType) {
      case 'mcq':
        return renderMCQ();
      case 'tf':
        return renderTF();
      case 'numeric':
        return renderNumeric();
      case 'fib':
        return renderFIB();
      case 'matching':
        return renderMatching();
      case 'ordering':
        return renderOrdering();
      case 'fr':
        return renderFR();
      default:
        return (
          <div className="question-answer-section">
            <textarea
              className="answer-input"
              placeholder="Enter your answer here..."
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={isSubmitted}
            />
          </div>
        );
    }
  };

  return (
    <div className="question-renderer">
      <div className="question-header">
        {question.problemNumber && (
          <span className="question-number">Question {question.problemNumber}</span>
        )}
        <span className="question-type-badge">{question.questionType.toUpperCase()}</span>
      </div>
      
      <div className="question-content">
        {question.imageUrl && (
          <div className="question-image">
            <img src={question.imageUrl} alt="Question image" />
          </div>
        )}
        
        <p className="question-text">{question.questionText}</p>
        
        {renderQuestionType()}
        
        {!isSubmitted && userAnswer && (
          <div className="check-answer-section">
            <button 
              className="check-answer-btn"
              onClick={checkAnswer}
              disabled={!userAnswer}
            >
              Check Answer
            </button>
          </div>
        )}
        
        {isChecked && (
          <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="feedback-icon">
              {isCorrect ? '✓' : '✗'}
            </div>
            <div className="feedback-text">
              {isCorrect ? 'Correct!' : 'Incorrect. Try again.'}
            </div>
          </div>
        )}
        
        {showCorrectAnswer && (
          <div className="correct-answer">
            <strong>Correct Answer:</strong>
            <span>{JSON.stringify(question.correctAnswer)}</span>
          </div>
        )}
        
        {question.explanation && (
          <div className="explanation">
            <strong>Explanation:</strong>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionRenderer;