import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Markdown from 'markdown-to-jsx';

interface UploadQueryPanelProps {
  queryText: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  llmOutput?: string;
  isLoading?: boolean;
  audioBase64?: string | null;
}

export const UploadQueryPanel: React.FC<UploadQueryPanelProps> = ({
  queryText,
  onQueryChange,
  onSubmit,
  llmOutput = '',
  isLoading = false,
  audioBase64,
}) => {
  const [showQuery, setShowQuery] = useState(false);
  const [activeMode, setActiveMode] = useState<'adapt' | 'summarize' | 'custom' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleModeSelect = (mode: 'adapt' | 'summarize' | 'custom') => {
    setActiveMode(mode);
    if (mode === 'custom') {
      setShowQuery(true);
    } else {
      setShowQuery(false);
      // Handle other modes here
      onQueryChange(mode === 'adapt' ? 'Adapt this content for learning' : 'Summarize this content');
      onSubmit();
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="w-1/4 bg-white shadow-md flex flex-col">
      <div className="p-6 flex flex-col gap-4 h-full">
        <h2 className="text-xl font-semibold text-gray-800">Query</h2>
        <div className="flex gap-2">
          <button 
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              activeMode === 'adapt' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            onClick={() => handleModeSelect('adapt')}
          >
            Adapt
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              activeMode === 'summarize' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            onClick={() => handleModeSelect('summarize')}
          >
            Summarise
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              activeMode === 'custom' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            onClick={() => handleModeSelect('custom')}
          >
            Custom
          </button>
        </div>
        
        {showQuery && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex-none">
              <label className="block text-sm font-medium text-gray-700 mb-2">User Query</label>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your custom query here..."
                value={queryText}
                onChange={(e) => onQueryChange(e.target.value)}
              />
            </div>
            <button 
              onClick={onSubmit}
              disabled={isLoading}
              className="flex-none w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm mt-4 relative"
            >
              {isLoading ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  </div>
                  <span className="opacity-0">Submit</span>
                </>
              ) : (
                'Submit'
              )}
            </button>
            {isLoading && (
              <div className="text-center mt-2 text-sm text-blue-600">
                Generating answers suited to you...
              </div>
            )}
          </motion.div>
        )}
        
        <div className="flex-1 min-h-0">
          {llmOutput && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Response</h3>
                {audioBase64 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayAudio}
                      className="flex items-center justify-center p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      title={isPlaying ? "Pause" : "Play Audio"}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <audio
                      ref={audioRef}
                      src={`data:audio/mp3;base64,${audioBase64}`}
                      onEnded={handleAudioEnded}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-[500px]">
                <Markdown
                  options={{
                    overrides: {
                      img: {
                        component: ({ alt, src }) => (
                          <img 
                            alt={alt} 
                            src={src} 
                            className="max-w-full h-auto my-4 rounded-lg shadow-lg"
                          />
                        ),
                      },
                    },
                  }}
                >
                  {llmOutput}
                </Markdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
