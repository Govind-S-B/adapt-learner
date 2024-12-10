import React from 'react';

interface SparkleButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
}

const SparkleButton: React.FC<SparkleButtonProps> = ({ onClick, isLoading }) => {
  return (
    <button 
      className={`sparkle-button ${isLoading ? 'animate-pulse' : ''}`}
      onClick={onClick}
      aria-label="Start learning process"
      disabled={isLoading}
    >
      {isLoading ? '🔄' : '✨'}
    </button>
  );
};

export default SparkleButton; 