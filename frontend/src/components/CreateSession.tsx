import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sessionService } from '../services/sessionService';
import { createMockSession } from '../services/mockQuestionService';
import './CreateSession.css';

interface CreateSessionProps {
  onClose?: () => void;
  onSessionCreated?: (sessionId: string) => void;
}

// Define topics for each subject
const subjectTopics: { [key: string]: string[] } = {
  math: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Linear Algebra'],
  physics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Quantum Physics'],
  biology: ['Cell Biology', 'Genetics', 'Ecology', 'Anatomy', 'Evolution'],
  chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry', 'Analytical Chemistry'],
  cs: ['Data Structures', 'Algorithms', 'Database Systems', 'Software Engineering', 'Machine Learning']
};

export default function CreateSession({ onClose, onSessionCreated }: CreateSessionProps) {
  const { user } = useAuth();
  // Session state
  const [sessionType, setSessionType] = useState<'practice' | 'test' | null>(null);
  const [questionAmount, setQuestionAmount] = useState<'10-20' | '20-30' | '30+' | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [otherTopics, setOtherTopics] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLog, setCurrentLog] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);

  // Update topics when subject changes
  useEffect(() => {
    if (subject) {
      setSelectedTopics([]);
      setOtherTopics('');
    }
  }, [subject]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const showLogSequentially = (logMessage: string, delay: number = 2500) => {
    setTimeout(() => {
      setCurrentLog(logMessage);
    }, delay);
  };

  // Parse log messages from log.txt and add agent prefixes
  const parseAndScheduleLogs = async () => {
    try {
      const response = await fetch('/log.txt');
      const logText = await response.text();
      const logLines = logText.split('\n').filter(line => line.trim());
      
      let searchLogs: string[] = [];
      let parseLogs: string[] = [];
      let validateLogs: string[] = [];
      
      // Parse each log line and categorize by agent
      logLines.forEach(line => {
        // Skip lines that are just object property expansions
        if (line.includes('[[Prototype]]') || !line.includes('step:')) {
          return;
        }
        
        // Extract the step from the log line
        const stepMatch = line.match(/step: '(search|parse|validate)'/);
        const messageMatch = line.match(/message: '([^']+)'/);
        
        if (stepMatch && messageMatch) {
          const step = stepMatch[1];
          let message = messageMatch[1];
          
          // Remove existing agent prefixes if they exist (case insensitive)
          message = message.replace(/^(Search agent|Parser agent|Parsing agent|Validation Agent|Validating Agent):\s*/i, '');
          
          if (step === 'search') {
            searchLogs.push(`Search Agent: ${message}`);
          } else if (step === 'parse') {
            parseLogs.push(`Parsing Agent: ${message}`);
          } else if (step === 'validate') {
            validateLogs.push(`Validating Agent: ${message}`);
          }
        }
        
        // Also handle tool_call status for validation
        const toolMatch = line.match(/status: 'tool_call'.*?tool: '([^']+)'.*?args: \{([^}]+)\}/);
        if (toolMatch) {
          const tool = toolMatch[1];
          const argsStr = toolMatch[2];
          const queryMatch = argsStr.match(/query: '([^']+)'/);
          if (queryMatch) {
            validateLogs.push(`Validating Agent: Tool call: ${tool} - ${queryMatch[1]}`);
          }
        }
        
        // Handle question progress
        const questionMatch = line.match(/status: 'question'.*?message: '([^']+)'/);
        if (questionMatch) {
          validateLogs.push(`Validating Agent: ${questionMatch[1]}`);
        }
      });
      
      // Schedule search logs (5 seconds total)
      const searchDelay = searchLogs.length > 0 ? 5000 / searchLogs.length : 0;
      searchLogs.forEach((log, index) => {
        showLogSequentially(log, index * searchDelay);
      });
      
      // Schedule parsing logs (20 seconds total, starting after search)
      const parseDelay = parseLogs.length > 0 ? 20000 / parseLogs.length : 0;
      parseLogs.forEach((log, index) => {
        showLogSequentially(log, 5000 + (index * parseDelay));
      });
      
      // Schedule validation logs (5 seconds total, starting after parsing)
      const validateDelay = validateLogs.length > 0 ? 5000 / validateLogs.length : 0;
      validateLogs.forEach((log, index) => {
        showLogSequentially(log, 25000 + (index * validateDelay));
      });
      
    } catch (error) {
      console.error('Error loading logs:', error);
      // Fallback to default logs if log.txt can't be loaded
      showLogSequentially('Search Agent: Starting search for relevant URLs...', 0);
      showLogSequentially('Parsing Agent: Processing content...', 5000);
      showLogSequentially('Validating Agent: Validating questions...', 25000);
    }
  };


  const handleGenerate = async () => {
    if (!sessionType || !questionAmount || !subject) return;
    
    setIsGenerating(true);
    setCurrentLog('');
    setShowLogs(true);
    
    try {
      // Normalize subject
      const normalizeSubject = (s: string) => s === 'cs' ? 'computer science' : s;
      
      // Map question amount to range
      const rangeMap: { [key: string]: [number, number] } = {
        '10-20': [10, 20],
        '20-30': [20, 30],
        '30+': [30, 50]
      };
      
      // Build topics array with other topics if provided
      const topics = [...selectedTopics];
      if (otherTopics.trim()) {
        topics.push(otherTopics.trim());
      }
      
      // Build search request
      const searchRequest = {
        subject: normalizeSubject(subject),
        topics,
        num_questions_range: rangeMap[questionAmount],
        mode: sessionType,
        user_id: user?.id
      };
      
      // Load and schedule logs from log.txt with custom timing
      parseAndScheduleLogs();
      
      // Skip agent service and go directly to mock data after logs complete
      setTimeout(() => {
        const sessionId = createMockSession();
        setCurrentLog('Session created successfully - Redirecting to practice mode...');
        setTimeout(() => {
          setIsGenerating(false);
          if (onSessionCreated) {
            onSessionCreated(sessionId);
          }
        }, 1000);
      }, 30000); // Wait for all logs to complete (30 seconds)
      
    } catch (error) {
      console.error('Error creating session:', error);
      setCurrentLog('Error: Session creation failed - Please try again');
      setTimeout(() => {
        setIsGenerating(false);
      }, 2000);
    }
  };

  const getCurrentTopics = () => {
    return subject ? subjectTopics[subject] : [];
  };

  return (
    <div className="create-session-overlay">
      <div className="create-session-modal">
        {/* Close button */}
        <div className="create-session-header">
          <button className="create-session-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="create-session-content">
          {/* Session Type */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Session Type</h2>
            <div className="create-session-chip-group">
              <button 
                className={`create-session-chip ${sessionType === 'practice' ? 'active' : ''}`}
                onClick={() => setSessionType('practice')}
              >
                Practice
              </button>
              <button 
                className={`create-session-chip ${sessionType === 'test' ? 'active' : ''}`}
                onClick={() => setSessionType('test')}
              >
                Test
              </button>
            </div>
          </div>

          {/* Question Amount */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Question Range</h2>
            <div className="create-session-chip-group">
              <button 
                className={`create-session-chip range-chip ${questionAmount === '10-20' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('10-20')}
              >
                10-20
              </button>
              <button 
                className={`create-session-chip range-chip ${questionAmount === '20-30' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('20-30')}
              >
                20-30
              </button>
              <button 
                className={`create-session-chip range-chip ${questionAmount === '30+' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('30+')}
              >
                30+
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Subject</h2>
            <div className="create-session-subject-grid">
              <button 
                className={`create-session-chip subject-chip math ${subject === 'math' ? 'active' : ''}`}
                onClick={() => setSubject('math')}
              >
                Math
              </button>
              <button 
                className={`create-session-chip subject-chip physics ${subject === 'physics' ? 'active' : ''}`}
                onClick={() => setSubject('physics')}
              >
                Physics
              </button>
              <button 
                className={`create-session-chip subject-chip biology ${subject === 'biology' ? 'active' : ''}`}
                onClick={() => setSubject('biology')}
              >
                Biology
              </button>
              <button 
                className={`create-session-chip subject-chip chemistry ${subject === 'chemistry' ? 'active' : ''}`}
                onClick={() => setSubject('chemistry')}
              >
                Chemistry
              </button>
              <button 
                className={`create-session-chip subject-chip cs ${subject === 'cs' ? 'active' : ''}`}
                onClick={() => setSubject('cs')}
              >
                Computer Science
              </button>
            </div>
          </div>

          {/* Topics */}
          {subject && (
            <div className="create-session-step">
              <h2 className="create-session-step-title">Topics</h2>
              <div className="create-session-topic-chips">
                {getCurrentTopics().map((topic, index) => (
                  <button
                    key={index}
                    className={`create-session-chip topic-chip ${selectedTopics.includes(topic) ? 'active' : ''}`}
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <div className="create-session-other">
                <label htmlFor="other-input" className="create-session-other-label">Other topics or specific focus:</label>
                <div className="create-session-other-input-container">
                  <input 
                    type="text"
                    id="other-input"
                    className="create-session-text-input"
                    placeholder="e.g., focus on quadratic equations..."
                    value={otherTopics}
                    onChange={(e) => setOtherTopics(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="create-session-generate-container">
            <button 
              className={`create-session-generate-btn ${isGenerating ? 'generating' : ''}`}
              onClick={handleGenerate}
              disabled={!sessionType || !questionAmount || !subject || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Questions →'}
            </button>
          </div>

          {/* Agent Logs */}
          {showLogs && (
            <div className="create-session-logs-container">
              {currentLog && (
                <div className="log-status-message">
                  <span className="log-status-text">{currentLog}</span>
                </div>
              )}
              {isGenerating && !currentLog && (
                <div className="log-status-message typing">
                  <div className="log-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
