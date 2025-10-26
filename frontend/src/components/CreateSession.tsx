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

  const handleGenerate = async () => {
    if (!sessionType || !questionAmount || !subject) return;
    
    setIsGenerating(true);
    
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
      
      // Call backend agent service in background (for logging/processing)
      // Fire and forget - don't wait for response
      sessionService.createSession(searchRequest, (data) => {
        // Progress updates and logs can be captured here
        console.log('Agent service progress:', data);
      }).catch(error => {
        // Silent fail - agent runs in background for logging purposes
        console.log('Agent service running in background:', error);
      });
      
      // Use mock data for immediate frontend response
      const sessionId = createMockSession();
      
      if (onSessionCreated) {
        onSessionCreated(sessionId);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsGenerating(false);
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
        </div>
      </div>
    </div>
  );
}
