import React, { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted?: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [currentSubject, setCurrentSubject] = useState(0);
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubject((prev) => (prev + 1) % subjects.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [subjects.length]);

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="landing-page__background">
        <div className="landing-page__particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`landing-page__particle landing-page__particle--${i % 4}`} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="landing-page__container">
        {/* Hero Section */}
        <div className="landing-page__hero">
          <div className="landing-page__logo">
            <div className="landing-page__logo-icon">
              <div className="landing-page__atom">
                <div className="landing-page__atom-nucleus"></div>
                <div className="landing-page__atom-orbit orbit-1"></div>
                <div className="landing-page__atom-orbit orbit-2"></div>
                <div className="landing-page__atom-orbit orbit-3"></div>
              </div>
            </div>
            <h1 className="landing-page__title">
              🦆 Platypus <span className="landing-page__title-accent">Academy</span>
            </h1>
          </div>

          <div className="landing-page__subtitle-container">
            <h2 className="landing-page__subtitle">
              Master STEM with AI-Powered Practice Tests
            </h2>
            <div className="landing-page__subject-rotator">
              <span className="landing-page__subject-label">Practice</span>
              <span className="landing-page__subject-text">
                {subjects[currentSubject]}
              </span>
            </div>
          </div>

          <p className="landing-page__description">
            Generate personalized practice tests, track your progress, and excel in STEM subjects 
            with our intelligent AI tutoring system.
          </p>
        </div>

        {/* Features Section */}
        <div className="landing-page__features">
          <div className="landing-page__feature">
            <div className="landing-page__feature-icon">
              <div className="landing-page__brain-icon">🧠</div>
            </div>
            <h3>AI-Generated Questions</h3>
            <p>Smart algorithms create personalized practice tests</p>
          </div>

          <div className="landing-page__feature">
            <div className="landing-page__feature-icon">
              <div className="landing-page__chart-icon">📊</div>
            </div>
            <h3>Progress Tracking</h3>
            <p>Monitor your improvement with detailed analytics</p>
          </div>

          <div className="landing-page__feature">
            <div className="landing-page__feature-icon">
              <div className="landing-page__lightning-icon">⚡</div>
            </div>
            <h3>Instant Feedback</h3>
            <p>Get immediate explanations and solutions</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="landing-page__cta">
          <button className="landing-page__get-started-btn" onClick={onGetStarted}>
            <span className="landing-page__btn-text">Get Started</span>
            <div className="landing-page__btn-arrow">→</div>
          </button>
          <p className="landing-page__cta-subtext">
            Join thousands of students already mastering STEM
          </p>
        </div>

        {/* Floating Elements */}
          <div className="landing-page__floating-elements">
          <div className="landing-page__floating-plant">🌱</div>
          <div className="landing-page__floating-leaf">🍃</div>
          <div className="landing-page__floating-flower">🌸</div>
          <div className="landing-page__floating-duck">🦆</div>
          <div className="landing-page__floating-water">💧</div>
          <div className="landing-page__floating-sun">☀️</div>
        </div>
      </div>
    </div>
  );
}
