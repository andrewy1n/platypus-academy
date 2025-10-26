import { useEffect } from 'react';
import { useChat } from '../contexts/ChatProvider';

interface UsePracticeChatProps {
  practiceSessionId: string;
  isActive: boolean;
}

export function usePracticeChat({ practiceSessionId, isActive }: UsePracticeChatProps) {
  const { startNewSession } = useChat();

  useEffect(() => {
    if (isActive && practiceSessionId) {
      startNewSession(practiceSessionId);
    }
  }, [practiceSessionId, isActive, startNewSession]);

  return {
    // Expose chat functionality for practice sessions
    // The actual chat state is managed by ChatProvider
  };
}
