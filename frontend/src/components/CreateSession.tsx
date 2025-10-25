import React, { useState } from 'react';
import './CreateSession.css';

interface CreateSessionProps {
  onClose?: () => void;
  onSessionCreated?: (sessionData: any) => void;
}

export default function CreateSession({ onClose, onSessionCreated }: CreateSessionProps) {
  // Session state
  const [sessionType, setSessionType] = useState<'practice' | 'test' | null>(null);
  const [questionAmount, setQuestionAmount] = useState<'10-20' | '20-30' | '30+' | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [otherTopics, setOtherTopics] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // TODO: Replace this with actual topic list from backend
  const topicList = ['Linear Algebra', 'Calculus', 'Trigonometry', 'Statistics'];

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // This will be connected to the backend when ready
    const sessionData = {
      type: sessionType,
      questionAmount,
      subject,
      topics: selectedTopics,
      otherTopics
    };
    console.log('Session data to send:', sessionData);
    // TODO: Call backend API here
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
    
    // Call the session created callback
    if (onSessionCreated) {
      onSessionCreated(sessionData);
    }
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
          {/* Step 1: Choose Session Type */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Step 1: Choose a session type</h2>
            <div className="create-session-button-group">
              <button 
                className={`create-session-btn practice ${sessionType === 'practice' ? 'active' : ''}`}
                onClick={() => setSessionType('practice')}
              >
                Practice Session
              </button>
              <button 
                className={`create-session-btn test ${sessionType === 'test' ? 'active' : ''}`}
                onClick={() => setSessionType('test')}
              >
                Test Session
              </button>
            </div>
          </div>

          {/* Step 2: Question Amount */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Step 2: Question amount</h2>
            <div className="create-session-button-group">
              <button 
                className={`create-session-btn amount-btn ${questionAmount === '10-20' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('10-20')}
              >
                10-20
              </button>
              <button 
                className={`create-session-btn amount-btn ${questionAmount === '20-30' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('20-30')}
              >
                20-30
              </button>
              <button 
                className={`create-session-btn amount-btn ${questionAmount === '30+' ? 'active' : ''}`}
                onClick={() => setQuestionAmount('30+')}
              >
                30+
              </button>
            </div>
          </div>

          {/* Step 3: Subject */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">Step 3: Subject</h2>
            <div className="create-session-subject-grid">
              <button 
                className={`create-session-btn subject-btn math ${subject === 'math' ? 'active' : ''}`}
                onClick={() => setSubject('math')}
              >
                Math
              </button>
              <button 
                className={`create-session-btn subject-btn physics ${subject === 'physics' ? 'active' : ''}`}
                onClick={() => setSubject('physics')}
              >
                Physics
              </button>
              <button 
                className={`create-session-btn subject-btn biology ${subject === 'biology' ? 'active' : ''}`}
                onClick={() => setSubject('biology')}
              >
                Biology
              </button>
              <button 
                className={`create-session-btn subject-btn chemistry ${subject === 'chemistry' ? 'active' : ''}`}
                onClick={() => setSubject('chemistry')}
              >
                Chemistry
              </button>
              <button 
                className={`create-session-btn subject-btn cs ${subject === 'cs' ? 'active' : ''}`}
                onClick={() => setSubject('cs')}
              >
                Computer Science
              </button>
            </div>
          </div>

          {/* Step 4: Topics */}
          <div className="create-session-step">
            <h2 className="create-session-step-title">
              Step 4: Topics
            </h2>
            <div className="create-session-topics">
              {topicList.map((topic, index) => (
                <div key={index} className="create-session-topic-item">
                  <input 
                    type="checkbox" 
                    id={`topic-${index}`}
                    className="create-session-checkbox"
                    checked={selectedTopics.includes(topic)}
                    onChange={() => toggleTopic(topic)}
                  />
                  <label 
                    htmlFor={`topic-${index}`} 
                    className="create-session-topic-label"
                  >
                    {topic}
                  </label>
                </div>
              ))}

              <div className="create-session-other">
                <label htmlFor="other-input" className="create-session-other-label">Other</label>
                <div className="create-session-other-input-container">
                  <input 
                    type="text"
                    id="other-input"
                    className="create-session-text-input"
                    placeholder="textarea"
                    value={otherTopics}
                    onChange={(e) => setOtherTopics(e.target.value)}
                  />
                  <p className="create-session-other-hint">
                    "Anything specific you'd like to focus on?"
                  </p>
                  <p className="create-session-other-example">
                    Example: "Focus on graphing linear equations" or "Include more conceptual questions."
                  </p>
                </div>
              </div>
            </div>
          </div>

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
