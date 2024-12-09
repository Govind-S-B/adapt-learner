import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const loadingTexts = [
  "Analyzing your voice patterns...",
  "Discovering your learning preferences...",
  "Understanding personality traits...",
  "Creating personalized insights...",
  "Almost there, cooking up something special...",
];

export function LoadingPage() {
  const navigate = useNavigate();
  const [currentText, setCurrentText] = useState(loadingTexts[0]);

  useEffect(() => {
    let currentIndex = 0;

    // Change text every 3 seconds
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % loadingTexts.length;
      setCurrentText(loadingTexts[currentIndex]);
    }, 3000);

    // Navigate to result page after 5 seconds
    const timer = setTimeout(() => {
      navigate('/result');
    }, 15000); // Adjusted to allow all quotes to cycle through

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100">
      <motion.div
        className="text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Loading Spinner */}
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>

        {/* Animated Text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentText}
            className="text-xl text-gray-700 font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            {currentText}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
