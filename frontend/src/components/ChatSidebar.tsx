import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatProvider';
import { ChatMessage } from '../types/chat';
import './ChatSidebar.css';

export default function ChatSidebar() {
  const { isModalOpen, closeModal, messages, sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isModalOpen) return null;

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-title">
          <div className="chat-sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3>Practice Helper</h3>
        </div>
        <button className="chat-sidebar-close" onClick={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-sidebar-messages">
        {messages.length === 0 ? (
          <div className="chat-sidebar-empty">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h4>Need help with your practice?</h4>
            <p>Ask me anything about the questions you're working on!</p>
          </div>
        ) : (
          messages.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={`chat-message ${message.sender}`}
            >
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-content">
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-sidebar-input" onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for help with this question..."
            disabled={isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
