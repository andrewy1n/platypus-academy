import React from 'react';
import './SourceModal.css';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLink: string;
  questionNumber: number;
}

const SourceModal: React.FC<SourceModalProps> = ({
  isOpen,
  onClose,
  sourceLink,
  questionNumber
}) => {
  if (!isOpen) return null;

  const handleOpenLink = () => {
    window.open(sourceLink, '_blank', 'noopener,noreferrer');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="source-modal-overlay" onClick={handleBackdropClick}>
      <div className="source-modal">
        <div className="source-modal-header">
          <h3>Question {questionNumber} Source</h3>
          <button className="source-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className="source-modal-content">
          <p className="source-modal-description">
            This question is sourced from:
          </p>
          <div className="source-link-container">
            <a 
              href={sourceLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-link"
            >
              {sourceLink}
            </a>
          </div>
          <div className="source-modal-actions">
            <button 
              className="source-modal-button primary"
              onClick={handleOpenLink}
            >
              Open Source
            </button>
            <button 
              className="source-modal-button secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceModal;
