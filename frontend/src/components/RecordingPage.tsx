import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, PauseCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function RecordingPage({ type }: { type: string }) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingStopped, setRecordingStopped] = useState(false); // New state
  const fileInputRef = useRef(null);

  const handleRecordClick = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingStopped(false);
  };

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };

  const handleStopClick = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingStopped(true);
    
    // Store the recorded state in localStorage
    const recordedOptions = JSON.parse(localStorage.getItem('recordedOptions') || '[]');
    if (!recordedOptions.includes(type)) {
      recordedOptions.push(type);
      localStorage.setItem('recordedOptions', JSON.stringify(recordedOptions));
    }
  };

  const handleNavigateHome = () => {
    // Ensure the recorded state is saved before navigating
    const recordedOptions = JSON.parse(localStorage.getItem('recordedOptions') || '[]');
    if (!recordedOptions.includes(type)) {
      recordedOptions.push(type);
      localStorage.setItem('recordedOptions', JSON.stringify(recordedOptions));
    }
    navigate('/');
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 p-2 hover:bg-white/50 rounded-full transition-colors"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600" />
      </button>

      {/* Static Title */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Let's get to know {type?.charAt(0).toUpperCase() + type?.slice(1)}
        </h2>

        {/* Dynamic Recording UI */}
        {!recordingStopped ? (
          <motion.div
            className="relative flex justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {isRecording ? (
              <motion.div
                className="flex space-x-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                {/* Pause Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePauseClick}
                  className={`p-4 rounded-full shadow-md hover:shadow-lg transition-all ${
                    isPaused ? 'bg-yellow-300' : 'bg-white'
                  }`}
                >
                  <PauseCircle className="w-8 h-8 text-gray-600" />
                  <span className="flex  jus text-sm mt-1">
                    {isPaused ? 'Resume' : 'Pause'}
                  </span>
                </motion.button>

                {/* Stop Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStopClick}
                  className="p-4 rounded-full bg-white shadow-md hover:shadow-lg transition-all"
                >
                  <StopCircle className="w-8 h-8 text-red-600" />
                  <span className="block text-sm mt-1">Stop</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                className="w-32 h-32 mx-auto rounded-full bg-red-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {/* Record Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRecordClick}
                  className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Mic className="w-8 h-8 text-gray-600" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="flex justify-center items-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <button
              onClick={handleNavigateHome}
              className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
            >
              Go to Home
            </button>
          </motion.div>
        )}

        {/* Upload Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUploadClick}
          className="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow space-x-2 text-gray-700 font-medium"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Audio</span>
        </motion.button>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
