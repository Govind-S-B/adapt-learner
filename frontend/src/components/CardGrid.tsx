import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LoadingPage } from './LoadingPage';

export function CardGrid() {
  const navigate = useNavigate();
  const [recordedOptions, setRecordedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load recorded options from localStorage
    const savedOptions = JSON.parse(localStorage.getItem('recordedOptions') || '[]');
    setRecordedOptions(savedOptions);
  }, []);

  const handleCardClick = (e: React.MouseEvent, path: string, type: string) => {
    if (recordedOptions.includes(type)) {
      e.preventDefault();
      return;
    }
    navigate(path);
  };

  const handleReset = () => {
    localStorage.removeItem('recordedOptions');
    setRecordedOptions([]);
  };

  const handleCreatePersona = async () => {
    setIsLoading(true);
    navigate('/loading');
    
    try {
      const response = await fetch('http://localhost:8000/ai/create-user-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create persona');
      }

      const data = await response.json();
      if (data.status === 'success') {
        // Navigation to result is handled by LoadingPage
      } else {
        throw new Error('Failed to create persona');
      }
    } catch (error) {
      console.error('Error creating persona:', error);
      setIsLoading(false);
      navigate('/'); // Return to home on error
    }
  };

  const allOptionsRecorded = recordedOptions.length === 3;

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="max-w-md mx-auto grid grid-cols-1 gap-4">
      <div className="text-center space-y-3 mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Let's get to know 
        </h2>
        {recordedOptions.length > 0 && !allOptionsRecorded && (
          <button
            onClick={handleReset}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {allOptionsRecorded ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-gray-600">All recordings completed!</p>
          <button
            onClick={handleCreatePersona}
            className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors font-medium"
          >
            Create Persona
          </button>
          <button
            onClick={handleReset}
            className="block mx-auto mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Start Over
          </button>
        </motion.div>
      ) : (
        <>
          <Link 
            to="/record/student" 
            onClick={(e) => handleCardClick(e, '/record/student', 'your Student')}
            className={`p-4 bg-white rounded-lg shadow text-center transition-all ${
              recordedOptions.includes('your Student') 
                ? 'opacity-50 cursor-not-allowed pointer-events-none' 
                : 'hover:shadow-md'
            }`}
          >
            Your Student
          </Link>
          <Link 
            to="/record/child"
            onClick={(e) => handleCardClick(e, '/record/child', 'your Child')}
            className={`p-4 bg-white rounded-lg shadow text-center transition-all ${
              recordedOptions.includes('your Child')
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'hover:shadow-md'
            }`}
          >
            Your Child
          </Link>
          <Link 
            to="/record/you"
            onClick={(e) => handleCardClick(e, '/record/you', 'You')}
            className={`p-4 bg-white rounded-lg shadow text-center transition-all ${
              recordedOptions.includes('You')
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'hover:shadow-md'
            }`}
          >
            You
          </Link>
        </>
      )}
    </div>
  );
}
