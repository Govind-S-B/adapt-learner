import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';

export function HomePage() {
  const navigate = useNavigate();
  const [recordedOptions, setRecordedOptions] = useState<string[]>([]);

  useEffect(() => {
    // Load recorded options from localStorage
    const savedOptions = JSON.parse(localStorage.getItem('recordedOptions') || '[]');
    setRecordedOptions(savedOptions);
  }, []);

  const handleCardClick = (path: string, type: string) => {
    if (!recordedOptions.includes(type)) {
      navigate(path);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-12">Choose an Option</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card
          title="You"
          onClick={() => handleCardClick('/you', 'You')}
          disabled={recordedOptions.includes('You')}
        />
        <Card
          title="Your Student"
          onClick={() => handleCardClick('/student', 'your Student')}
          disabled={recordedOptions.includes('your Student')}
        />
        <Card
          title="Your Child"
          onClick={() => handleCardClick('/child', 'your Child')}
          disabled={recordedOptions.includes('your Child')}
        />
      </div>
    </div>
  );
}
