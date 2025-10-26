import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted?: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-page__container">
        <h1 className="landing-page__title">Platypus Academy</h1>
        
        <div className="landing-page__image-container">
          <img 
            src="/imgs/perry-reading.png" 
            alt="Platypus Academy" 
            className="landing-page__platypus-image"
          />
        </div>
        
        <button 
          className="landing-page__get-started-button"
          onClick={onGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
