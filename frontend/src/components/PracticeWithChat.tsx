import React, { useState } from 'react';
import { usePracticeChat } from '../hooks/usePracticeChat';
import ChatBubble from './ChatBubble';
import ChatSidebar from './ChatSidebar';
import './PracticeWithChat.css';

interface PracticeWithChatProps {
  children: React.ReactNode;
  practiceSessionId: string;
  isActive: boolean;
}

export default function PracticeWithChat({ 
  children, 
  practiceSessionId, 
  isActive 
}: PracticeWithChatProps) {
  // Initialize chat for this practice session
  usePracticeChat({ practiceSessionId, isActive });

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
