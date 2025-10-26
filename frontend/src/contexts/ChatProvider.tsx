'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ChatContextType, ChatMessage, ChatSession } from '../types/chat';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);

    try {
      // TODO: Replace with actual Claude API call
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        content: `I understand you're asking about: "${content.trim()}". This is a placeholder response that will be replaced with Claude's actual response.`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session
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
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
    }
  }, [currentSession, messages]);

  const value: ChatContextType = {
    isModalOpen,
    currentSession,
    messages,
    isLoading,
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
