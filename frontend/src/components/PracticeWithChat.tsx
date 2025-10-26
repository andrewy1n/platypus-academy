import React, { useState, useEffect } from 'react';
import { usePracticeChat } from '../hooks/usePracticeChat';
import { useChat } from '../contexts/ChatProvider';
import { Question } from './QuestionRenderer';
import ChatBubble from './ChatBubble';
import ChatSidebar from './ChatSidebar';
import './PracticeWithChat.css';

interface PracticeWithChatProps {
  children: React.ReactNode;
  practiceSessionId: string;
  isActive: boolean;
  currentQuestion?: Question | null;
  currentQuestionIndex?: number;
}

export default function PracticeWithChat({ 
  children, 
  practiceSessionId, 
  isActive,
  currentQuestion,
  currentQuestionIndex = 0
}: PracticeWithChatProps) {
  const { updateCurrentQuestion } = useChat();
  
  // Initialize chat for this practice session
  usePracticeChat({ practiceSessionId, isActive });

  // Update chat context with current question
  useEffect(() => {
    updateCurrentQuestion(currentQuestion, currentQuestionIndex);
  }, [currentQuestion, currentQuestionIndex, updateCurrentQuestion]);

  return (
    <div className="practice-with-chat">
      {/* Main practice content */}
      <div className="practice-content">
        {children}
      </div>
      
      {/* Chat components - only show when practice is active */}
      {isActive && (
        <>
          <ChatBubble isVisible={true} />
          <ChatSidebar />
        </>
      )}
    </div>
  );
}
