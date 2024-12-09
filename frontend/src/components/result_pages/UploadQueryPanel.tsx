import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface UploadQueryPanelProps {
  queryText: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  llmOutput?: string;
  isLoading?: boolean;
}

export const UploadQueryPanel: React.FC<UploadQueryPanelProps> = ({
  queryText,
  onQueryChange,
  onSubmit,
  llmOutput = '',
  isLoading = false,
}) => {
  const [showQuery, setShowQuery] = useState(false);
  const [activeMode, setActiveMode] = useState<'adapt' | 'summarize' | 'custom' | null>(null);

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
          <label className="block text-sm font-medium text-gray-700 mb-2">Your personalised answer</label>
          <div className="h-full bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
              {llmOutput || 'No response yet...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
