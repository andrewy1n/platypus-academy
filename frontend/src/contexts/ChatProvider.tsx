'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ChatContextType, ChatMessage, ChatSession } from '../types/chat';
import { chatService } from '../services/chatService';
import { useAuth } from './AuthContext';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Ref to track if we're currently processing a message
  const processingRef = useRef(false);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const startNewSession = useCallback((practiceSessionId: string) => {
    // Only start a new session if we don't already have one for this practice session
    if (currentSession?.practiceSessionId !== practiceSessionId) {
      const newSession: ChatSession = {
        id: `chat-${Date.now()}`,
        practiceSessionId,
        messages: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setCurrentSession(newSession);
      setMessages([]);
    }
  }, [currentSession]);

  const clearChat = useCallback(() => {
    setMessages([]);
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        messages: [],
        updatedAt: new Date(),
      });
    }
  }, [currentSession]);

  const sendMessage = useCallback(async (content: string) => {
    if (processingRef.current || !content.trim()) return;

    processingRef.current = true;
    setIsLoading(true);

    const trimmed = content.trim();

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);

    try {
      const practiceSessionId = currentSession?.practiceSessionId || '';
      const userId = user?.id || '';
      
      // Callback to update status messages in real-time
      const onStatusUpdate = (status: string) => {
        console.log('📢 Status update received:', status);
        setStatusMessage(status);
      };
      
      const assistantText = await chatService.sendMessage(
        practiceSessionId, 
        trimmed, 
        userId,
        onStatusUpdate
      );

      // Clear status message when complete
      setStatusMessage('');

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        content: assistantText || '...',
        sender: 'assistant',
        timestamp: new Date(),
        isInitialGreeting: messages.length === 0, // Mark as initial greeting if it's the first message
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...messages, userMessage, assistantMessage],
          updatedAt: new Date(),
        };
        setCurrentSession(updatedSession);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      let errorText = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorText = 'Chat endpoint not found. Please check your backend configuration.';
        } else if (error.message.includes('Not Found')) {
          errorText = 'Chat endpoint not available. The backend may not have this endpoint configured.';
        } else if (error.message.includes('Failed to connect to agents service')) {
          errorText = '⚠️ Backend Error: Failed to connect to agents service. Please check your backend configuration.';
        } else if (error.message.includes('Assistant step failed')) {
          errorText = '⚠️ AI Assistant Error: The assistant encountered an issue. This might be a temporary problem with the AI service.';
        } else if (error.message.includes("'tool'")) {
          errorText = '⚠️ Tool Error: There was an issue with the AI tools. Please try again or contact support.';
        } else if (error.message.length > 0 && error.message.length < 200) {
          // Show the actual error message if it's reasonable length
          errorText = `⚠️ ${error.message}`;
        }
      }

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        content: errorText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
      processingRef.current = false;
    }
  }, [currentSession, messages]);

  const value: ChatContextType = {
    isModalOpen,
    currentSession,
    messages,
    isLoading,
    statusMessage,
    openModal,
    closeModal,
    sendMessage,
    startNewSession,
    clearChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
