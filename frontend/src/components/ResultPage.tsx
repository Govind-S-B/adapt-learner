import React, { useState, useEffect } from 'react';
import 'cropperjs/dist/cropper.css';
import html2canvas from 'html2canvas';
// import { Header } from './result_pages/Header';
import { UploadQueryPanel } from './result_pages/UploadQueryPanel';
import { PDFViewer } from './result_pages/PDFViewer';
import { Selection } from './result_pages/types';
import SparkleButton from './SparkleButton';
import '../styles/SparkleButton.css';

export function ResultPage() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [llmOutput, setLlmOutput] = useState('');
  const [audioData, setAudioData] = useState<string | null>(null);
  const [pdfViewportSize, setPdfViewportSize] = useState({ width: 800, height: 600 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [activeSelection, setActiveSelection] = useState<Selection | null>(null);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [isLearning, setIsLearning] = useState(false);

  // Adjust PDF viewport size based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth * 0.6, 800);
      const height = Math.min(window.innerHeight * 0.8, 600);
      setPdfViewportSize({ width, height });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are supported');
        return;
      }
      setUploadedFile(URL.createObjectURL(file));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width > 5 && height > 5) {
      setActiveSelection({ x, y, width, height });
    }
  };

  const clearSelection = () => {
    setActiveSelection(null);
  };

  const selectFullArea = () => {
    const viewerElement = document.querySelector('.rpv-core__viewer-zone') as HTMLElement;
    if (!viewerElement) return;
    
    const rect = viewerElement.getBoundingClientRect();
    const selection = {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height
    };
    
    setActiveSelection(selection);
  };

  const captureScreenshot = async (selection: Selection | null) => {
    try {
      const viewerElement = document.querySelector('.rpv-core__viewer') ||
                           document.querySelector('[role="presentation"]') ||
                           document.querySelector('canvas');

      if (!viewerElement) {
        console.error('No viewer element found');
        return null;
      }

      const canvas = await html2canvas(viewerElement as HTMLElement, {
        x: selection ? selection.x : 0,
        y: selection ? selection.y : 0,
        width: selection ? selection.width : viewerElement.clientWidth,
        height: selection ? selection.height : viewerElement.clientHeight,
      });

      const base64Image = canvas.toDataURL('image/jpeg');
      setScreenshotData(base64Image);
      return base64Image;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    console.group('Form Submission');
    console.log('Query Text:', queryText);
    
    setIsLoading(true);
    let screenshotData = null;
    
    if (activeSelection) {
      console.log('Debug: Active selection found:', activeSelection);
      screenshotData = await captureScreenshot(activeSelection);
    } else {
      console.log('Debug: No active selection, capturing full view');
      const viewerElement = document.querySelector('.rpv-core__viewer') ||
                           document.querySelector('[role="presentation"]') ||
                           document.querySelector('canvas');

      if (viewerElement) {
        const rect = viewerElement.getBoundingClientRect();
        screenshotData = await captureScreenshot({
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height
        });
      }
    }

    if (screenshotData) {
      try {
        const response = await fetch('http://localhost:8000/ai/call-multimodal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: queryText,
            image_base64: screenshotData
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from API');
        }

        const data = await response.json();
        setLlmOutput(data.response);
        setAudioData(data.audio_base64);
        console.log('API Response:', data.response);
      } catch (error) {
        console.error('Error calling API:', error);
        setLlmOutput('Error: Failed to get response from the AI model');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error('No screenshot data available');
      setLlmOutput('Error: Failed to capture screenshot');
      setIsLoading(false);
    }
    
    console.groupEnd();
  };

  const handleFeedbackSubmit = async () => {
    try {
      console.log("Screenshot Data : ",screenshotData)
      const response = await fetch('http://localhost:8000/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: queryText,
          material: screenshotData,
          output: llmOutput,
          feedback: feedback
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Clear feedback after successful submission
      setFeedback('');
      alert('Feedback submitted successfully!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  const handleLearnClick = async () => {
    setIsLearning(true);
    try {
      const response = await fetch('http://localhost:8000/ai/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Learning process failed');
      }

      const data = await response.json();
      if (data.status === 'success') {
        alert(`Learning completed successfully! Final score: ${data.final_score}`);
      }
    } catch (error) {
      console.error('Error during learning process:', error);
      alert('Failed to complete learning process');
    } finally {
      setIsLearning(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-blue-50">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex items-center justify-center relative">
          <SparkleButton 
            onClick={handleLearnClick}
            isLoading={isLearning}
          />
          {isLearning && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-blue-600 font-semibold">Learning in progress...</p>
              </div>
            </div>
          )}
          <PDFViewer
            uploadedFile={uploadedFile}
            pdfViewportSize={pdfViewportSize}
            isSelecting={isSelecting}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            activeSelection={activeSelection}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onSelectFullArea={selectFullArea}
            onClearSelection={clearSelection}
            onFileUpload={handleFileUpload}
          />
        </div>
        <UploadQueryPanel
          queryText={queryText}
          onQueryChange={setQueryText}
          onSubmit={handleSubmit}
          llmOutput={llmOutput}
          isLoading={isLoading}
          audioBase64={audioData}
          feedback={feedback}
          onFeedbackChange={setFeedback}
          onFeedbackSubmit={handleFeedbackSubmit}
        />
      </div>
    </div>
  );
}