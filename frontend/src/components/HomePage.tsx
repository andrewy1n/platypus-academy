import React from 'react';
import './HomePage.css';

interface HomePageProps {
  onNewSession?: () => void;
  onPreviousSessions?: () => void;
}

export default function HomePage({ onNewSession, onPreviousSessions }: HomePageProps) {
  return (
    <div className="homepage">
      <div className="homepage__container">
        <h1 className="homepage__welcome">
          👋 Welcome back Andrew!
        </h1>
        
        <p className="homepage__subtitle">
          Practice smarter with AI-generated STEM quizzes.
        </p>
        
        <div className="homepage__buttons">
          <button 
            className="homepage__new-session-button"
            onClick={onNewSession}
          >
            [➕ New Session]
          </button>
          
          <button 
            className="homepage__previous-sessions-button"
            onClick={onPreviousSessions}
          >
            📂 My Sessions
          </button>
        </div>
        
        <div className="homepage__image-container">
          <img 
            src="/imgs/perry-main.png" 
            alt="Platypus Scholar - Your AI Study Buddy" 
            className="homepage__platypus-image"
          />
          <p className="homepage__image-caption">Your AI study buddy!</p>
        </div>
      </div>
    </div>
  );
}
