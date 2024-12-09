import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import 'cropperjs/dist/cropper.css';
import html2canvas from 'html2canvas';

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ResultPage() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [pdfViewportSize, setPdfViewportSize] = useState({ width: 800, height: 600 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [activeSelection, setActiveSelection] = useState<Selection | null>(null);
  
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

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

  // Handles file upload
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
    if (!viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    
    if (!viewerContainerRef.current) return;
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    // Only set active selection if there's an actual selection (not just a click)
    if (width > 5 && height > 5) {
      setActiveSelection({ x, y, width, height });
    }
  };

  const clearSelection = () => {
    setActiveSelection(null);
  };

  const selectFullArea = () => {
    if (!viewerContainerRef.current) return;
    const viewerElement = viewerContainerRef.current.querySelector('.rpv-core__viewer-zone') as HTMLElement;
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

  const captureScreenshot = async (selection: Selection) => {
    if (!viewerContainerRef.current) {
      console.log('Debug: viewerContainerRef is null');
      return null;
    }
    
    // Try different selectors to find the PDF viewer element
    const viewerElement = 
      viewerContainerRef.current.querySelector('.rpv-core__viewer') || // Try first selector
      viewerContainerRef.current.querySelector('[role="presentation"]') || // Try role
      viewerContainerRef.current.querySelector('canvas'); // Try direct canvas
    
    if (!viewerElement) {
      console.log('Debug: PDF viewer element not found. Available elements:', {
        classes: viewerContainerRef.current.className,
        children: Array.from(viewerContainerRef.current.children).map(child => ({
          tagName: child.tagName,
          className: (child as HTMLElement).className,
          role: (child as HTMLElement).getAttribute('role')
        }))
      });
      return null;
    }

    console.log('Debug: Found viewer element:', {
      tagName: viewerElement.tagName,
      className: viewerElement.className,
      role: viewerElement.getAttribute('role')
    });

    try {
      console.log('Debug: Starting screenshot capture');
      console.log('Debug: Selection area:', selection);

      // Get the actual rendered PDF page
      const pdfPage = viewerElement.closest('.rpv-core__viewer-page') || viewerElement;
      
      // First capture the entire viewer
      const canvas = await html2canvas(pdfPage as HTMLElement, {
        scale: window.devicePixelRatio || 1,
        logging: true,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        ignoreElements: (element) => {
          // Ignore our selection overlay
          return element.classList.contains('absolute') && 
                 element.classList.contains('border-2') && 
                 element.classList.contains('border-blue-500');
        },
        onclone: (clonedDoc) => {
          console.log('Debug: Document cloned for capture');
        }
      });

      console.log('Debug: Full canvas captured, dimensions:', {
        width: canvas.width,
        height: canvas.height
      });

      // Create a new canvas for the cropped area
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = selection.width;
      croppedCanvas.height = selection.height;

      const ctx = croppedCanvas.getContext('2d');
      if (!ctx) {
        console.log('Debug: Failed to get 2D context for cropped canvas');
        return null;
      }

      // Draw the selected portion
      ctx.drawImage(
        canvas,
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        0,
        0,
        selection.width,
        selection.height
      );

      console.log('Debug: Cropped canvas created with dimensions:', {
        width: croppedCanvas.width,
        height: croppedCanvas.height
      });

      const dataUrl = croppedCanvas.toDataURL('image/png');
      console.log('Debug: Data URL created, length:', dataUrl.length);

      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    console.group('Form Submission');
    console.log('Query Text:', queryText);
    
    let screenshotData = null;
    
    if (activeSelection) {
      console.log('Debug: Active selection found:', activeSelection);
      screenshotData = await captureScreenshot(activeSelection);
    } else if (viewerContainerRef.current) {
      console.log('Debug: No active selection, capturing full view');
      // Try to find the viewer element with multiple selectors
      const viewerElement = 
        viewerContainerRef.current.querySelector('.rpv-core__viewer') ||
        viewerContainerRef.current.querySelector('[role="presentation"]') ||
        viewerContainerRef.current.querySelector('canvas');

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
      console.log('Screenshot captured successfully');
      const img = new Image();
      img.src = screenshotData;
      console.log('Screenshot preview:', img);
      console.log('Screenshot data URL length:', screenshotData.length);
    } else {
      console.log('No screenshot captured - Debug info:');
      console.log('- Active Selection:', activeSelection);
      console.log('- Viewer Container:', viewerContainerRef.current ? 'exists' : 'null');
      if (viewerContainerRef.current) {
        // Log all available elements for debugging
        console.log('- Available elements in container:', 
          Array.from(viewerContainerRef.current.children).map(child => ({
            tagName: child.tagName,
            className: (child as HTMLElement).className,
            role: (child as HTMLElement).getAttribute('role')
          }))
        );
      }
    }
    
    console.groupEnd();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Header */}
      <div className="py-3 px-6 bg-white shadow-md">
        <motion.h1
          className="text-3xl font-bold text-gray-800 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Adapt Learn
        </motion.h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel */}
        <div className="w-1/4 bg-white shadow-md flex flex-col">
          <div className="p-6 flex flex-col gap-4 h-full">
            <h2 className="text-xl font-semibold text-gray-800">Upload and Query</h2>
            <textarea
              className="flex-none w-full h-32 p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your query here..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            ></textarea>
            <div className="flex-none">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Document</label>
              <input
                type="file"
                accept=".pdf"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={handleFileUpload}
              />
            </div>
            <button 
              onClick={handleSubmit}
              className="flex-none w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-gray-50">
          <div className="h-full p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Output</h2>
              {uploadedFile && (
                <div className="flex gap-2">
                  <button
                    onClick={selectFullArea}
                    className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-1"
                    title="Select Full Visible Area"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
                    </svg>
                    <span className="text-sm">Full Area</span>
                  </button>
                  {activeSelection && (
                    <button
                      onClick={clearSelection}
                      className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-1"
                      title="Clear Selection"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">Clear</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
              {uploadedFile ? (
                <div 
                  ref={viewerContainerRef}
                  className="relative"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* PDF Viewer */}
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div
                      className="w-full"
                      style={{ width: pdfViewportSize.width, height: pdfViewportSize.height }}
                    >
                      <Viewer
                        fileUrl={uploadedFile}
                        defaultScale={SpecialZoomLevel.PageWidth}
                      />
                    </div>
                  </Worker>

                  {/* Selection Overlay */}
                  {(isSelecting || activeSelection) && (
                    <div
                      ref={selectionRef}
                      className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30"
                      style={{
                        left: isSelecting 
                          ? Math.min(selectionStart.x, selectionEnd.x) + 'px'
                          : activeSelection?.x + 'px',
                        top: isSelecting 
                          ? Math.min(selectionStart.y, selectionEnd.y) + 'px'
                          : activeSelection?.y + 'px',
                        width: isSelecting 
                          ? Math.abs(selectionEnd.x - selectionStart.x) + 'px'
                          : activeSelection?.width + 'px',
                        height: isSelecting 
                          ? Math.abs(selectionEnd.y - selectionStart.y) + 'px'
                          : activeSelection?.height + 'px',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500 text-center">
                    No file uploaded yet.<br />
                    Please upload a document to view it here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
