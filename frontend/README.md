# Platypus Academy Frontend

A Next.js application for AI-powered STEM practice tests with persistent chat functionality.

## Features

- **Landing Page**: Beautiful landing page with animated elements and call-to-action
- **Authentication**: Simple login page (demo mode)
- **Home Dashboard**: User dashboard with session management
- **Session Creation**: Create practice or test sessions with subject and topic selection
- **Question Rendering**: Support for 7 different question types:
  - Multiple Choice
  - True/False
  - Numeric Input
  - Fill in the Blank
  - Matching
  - Ordering (Drag & Drop)
  - Free Response
- **Persistent Chat**: AI-powered chat for practice sessions
- **Session Summary**: Detailed results with explanations and feedback
- **Session History**: View previous sessions and scores

## User Flow

1. **Landing Page** → Click "Get Started"
2. **Login Page** → Enter any credentials (demo mode)
3. **Home Dashboard** → Click "New Session" or "Previous Sessions"
4. **Create Session** → Select type, amount, subject, and topics
5. **Practice/Test Session** → Answer questions with persistent chat (practice mode)
6. **End Summary** → View results, explanations, and feedback

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   ├── home/              # Home dashboard
│   ├── practice/          # Practice/test sessions
│   └── sessions/           # Session history
├── components/             # React components
│   ├── LandingPage.tsx    # Landing page component
│   ├── HomePage.tsx       # Home dashboard
│   ├── CreateSession.tsx  # Session creation modal
│   ├── QuestionRenderer.tsx # Question display
│   ├── PracticeWithChat.tsx  # Chat wrapper
│   └── EndSummary.tsx     # Results summary
├── contexts/               # React contexts
│   └── ChatProvider.tsx   # Chat state management
└── types/                  # TypeScript types
    └── chat.ts            # Chat-related types
```

## Key Features

### Persistent Chat
- Chat is only available during practice sessions
- Each practice session gets its own chat context
- Chat state is managed through React Context
- Messages persist throughout the session

### Question Types
The application supports 7 different question types with appropriate UI components:
- **Multiple Choice**: Radio button selection
- **True/False**: Binary choice
- **Numeric**: Number input with validation
- **Fill in the Blank**: Text input
- **Matching**: Drag and drop matching interface
- **Ordering**: Drag and drop ordering
- **Free Response**: Textarea for longer answers

### Session Management
- Create sessions with custom parameters
- Track session progress
- View detailed results and explanations
- Access session history

## Development Notes

- The application uses Next.js 14 with the app directory
- TypeScript is configured for type safety
- CSS modules are used for component styling
- Chat functionality is ready for Claude API integration
- All components are fully functional with sample data

## Next Steps

1. Connect to backend API for real data
2. Integrate Claude API for chat functionality
3. Add user authentication
4. Implement session persistence
5. Add more question types and features