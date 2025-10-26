export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  isInitialGreeting?: boolean;
}

export interface ChatSession {
  id: string;
  practiceSessionId: string;
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextType {
  // State
  isModalOpen: boolean;
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  statusMessage: string;
  
  // Actions
  openModal: () => void;
  closeModal: () => void;
  sendMessage: (content: string) => Promise<void>;
  startNewSession: (practiceSessionId: string) => void;
  clearChat: () => void;
}
