import React from 'react';

interface SparkleButtonProps {
  onClick?: () => void;
}

const SparkleButton: React.FC<SparkleButtonProps> = ({ onClick }) => {
  return (
    <button 
      className="sparkle-button"
      onClick={onClick}
      aria-label="Sparkle action"
    >
      ✨
    </button>
  );
};

export default SparkleButton; 