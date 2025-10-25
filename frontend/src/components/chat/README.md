# Chat System for Practice Tests

This chat system provides a persistent chat bubble that appears during practice tests and opens a modal for AI-powered assistance.

## Components

### 1. ChatProvider.tsx
- **Purpose**: Context provider for managing chat state
- **Features**: 
  - Modal open/close state
  - Message history
  - Session management
  - Message sending with loading states

### 2. ChatBubble.tsx
- **Purpose**: Floating chat button
- **Features**:
  - Persistent during practice sessions
  - Notification badge for unread messages
  - Smooth animations and hover effects

### 3. ChatModal.tsx
- **Purpose**: Full-screen chat interface
- **Features**:
  - Message history display
  - Real-time typing indicators
  - Auto-scroll to latest messages
  - Responsive design

### 4. PracticeWithChat.tsx
- **Purpose**: Wrapper component for practice sessions
- **Features**:
  - Integrates chat with practice content
  - Manages chat session lifecycle
  - Only shows chat during active practice

## Usage

### Basic Integration

```tsx
import { ChatProvider } from './contexts/ChatProvider';
import PracticeWithChat from './components/PracticeWithChat';

function App() {
  return (
    <ChatProvider>
      <PracticeWithChat 
        practiceSessionId="session-123" 
        isActive={true}
      >
        <YourPracticeComponent />
      </PracticeWithChat>
    </ChatProvider>
  );
}
```

### Using Chat Context

```tsx
import { useChat } from './contexts/ChatProvider';

function MyComponent() {
  const { 
    isModalOpen, 
    messages, 
    sendMessage, 
    openModal 
  } = useChat();

  const handleSendMessage = async () => {
    await sendMessage("Help me with this question");
  };

  return (
    <div>
      <button onClick={openModal}>Open Chat</button>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
```

## Features

### Chat Bubble
- ✅ Persistent floating button
- ✅ Notification badge for unread messages
- ✅ Smooth animations
- ✅ Responsive design

### Chat Modal
- ✅ Full conversation history
- ✅ Real-time typing indicators
- ✅ Auto-scroll to latest messages
- ✅ Keyboard shortcuts (Enter to send)
- ✅ Mobile-optimized

### State Management
- ✅ Session-based chat history
- ✅ Loading states
- ✅ Error handling
- ✅ Message persistence

## Future Integration

The system is designed to integrate with Claude AI:

```tsx
// In ChatProvider.tsx - replace the mock response
const sendMessage = useCallback(async (content: string) => {
  // TODO: Replace with actual Claude API call
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content })
  });
  
  const data = await response.json();
  // Handle Claude response...
}, []);
```

## Styling

All components include comprehensive CSS with:
- Responsive design for mobile/tablet/desktop
- Smooth animations and transitions
- Accessible color schemes
- Consistent with app design system
