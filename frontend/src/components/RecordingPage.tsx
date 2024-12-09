import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, PauseCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function RecordingPage({ type }: { type: string }) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false); // New state for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const recordedOptions = JSON.parse(localStorage.getItem('recordedOptions') || '[]');
    if (!recordedOptions.includes(type)) {
      recordedOptions.push(type);
      localStorage.setItem('recordedOptions', JSON.stringify(recordedOptions));
    }
  };

  const handleNavigateHome = () => {
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true); // Set uploading state to true
      console.log('File selected:', file.name);

      try {
        setIsProcessing(true);
        setProcessMessage('Converting audio file...');
        console.log('Converting audio file to base64...');

        const base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data URL prefix
          };
          reader.readAsDataURL(file);
        });

        console.log('Base64 conversion successful.');
        setProcessMessage('Processing audio...');
        console.log('Sending audio to API endpoint...');

        const apiRole = (() => {
          const lowerType = type.toLowerCase();
          if (lowerType.includes('student')) return 'teacher';
          if (lowerType === 'you') return 'student'; // Check for exact match with 'you'
          if (lowerType.includes('child')) return 'parent'; 
          return type; // Fallback if no match
        })();
        
        
        const response = await fetch('http://localhost:8000/ai/set-initial-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: apiRole,
            audio: base64String,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to process audio: ${response.status} ${errorText}`);
        }

        const responseData = await response.json();
        console.log('API call successful, response data:', responseData);

        setProcessMessage('Audio processed successfully!');
        setTimeout(() => {
          setIsProcessing(false);
          setIsUploading(false); // Reset upload state
          setRecordingStopped(true);
        }, 2000);
      } catch (error) {
        console.error('Error processing audio:', error);
        setProcessMessage('Error processing audio. Please try again.');
        setTimeout(() => {
          setIsProcessing(false);
          setIsUploading(false); // Reset upload state
        }, 2000);
      }
    } else {
      console.warn('No file selected.');
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 p-2 hover:bg-white/50 rounded-full transition-colors"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600" />
      </button>

      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Let's get to know {type?.charAt(0).toUpperCase() + type?.slice(1)}
        </h2>

        {!recordingStopped ? (
          <motion.div
            className="relative flex justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {isRecording ? (
              <motion.div className="flex space-x-4">
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
              <motion.div className="w-32 h-32 mx-auto rounded-full bg-red-500 flex items-center justify-center">
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
            className="flex justify-center items-center space-y-4 flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {isProcessing ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">{processMessage}</p>
              </div>
            ) : (
              <button
                onClick={handleNavigateHome}
                className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
              >
                Go to Home
              </button>
            )}
          </motion.div>
        )}

        {/* Upload Button */}
        {isUploading ? (
          <div className="inline-flex items-center px-6 py-3 bg-gray-300 rounded-full shadow-md">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
            <span>Processing Audio...</span>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUploadClick}
            className="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow space-x-2 text-gray-700 font-medium"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Audio</span>
          </motion.button>
        )}

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
