import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

export function ResultPage() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pdfViewportSize, setPdfViewportSize] = useState({ width: 800, height: 600 });
  const viewerContainerRef = useRef(null);
  const cropperRef = useRef(null);

  // Adjust PDF viewport size based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth * 0.6, 800); // 60% of screen width or 800px max
      const height = Math.min(window.innerHeight * 0.8, 600); // 80% of screen height or 600px max
      setPdfViewportSize({ width, height });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handles file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are supported');
        return;
      }
      setUploadedFile(URL.createObjectURL(file));
    }
  };

  // Handles screenshot functionality
  const handleScreenshot = () => {
    if (cropperRef.current) {
      const cropper = cropperRef.current.cropper;
      const croppedCanvas = cropper.getCroppedCanvas();
      croppedCanvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          alert('Screenshot copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy screenshot to clipboard', err);
        }
      });
    }
  };

  // Handles screenshot selection from the PDF view
  const handleCropSelection = () => {
    const viewerElement = document.querySelector('.rpv-core__viewer-zone');
    if (!viewerElement) {
      alert('PDF viewer not found');
      return;
    }

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match the viewer
    const rect = viewerElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Draw the viewer content to canvas
    context.drawImage(viewerElement, 0, 0, canvas.width, canvas.height);
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setSelectedImage(dataUrl);
    } catch (err) {
      console.error('Failed to capture PDF view:', err);
      alert('Failed to capture the PDF view');
    }
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
            <button className="flex-none w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm">
              Submit
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-gray-50">
          <div className="h-full p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Output</h2>
            <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
              {uploadedFile ? (
                <div>
                  {/* PDF Viewer */}
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div
                      ref={viewerContainerRef}
                      className="w-full"
                      style={{ width: pdfViewportSize.width, height: pdfViewportSize.height }}
                    >
                      <Viewer
                        fileUrl={uploadedFile}
                        defaultScale={SpecialZoomLevel.PageWidth}
                      />
                    </div>
                  </Worker>

                  {/* Cropper for Screenshot */}
                  {selectedImage && (
                    <div className="mt-4">
                      <Cropper
                        src={selectedImage}
                        style={{ height: 400, width: '100%' }}
                        aspectRatio={0}
                        guides={true}
                        ref={cropperRef}
                      />
                      <button
                        onClick={handleScreenshot}
                        className="mt-4 py-2 px-6 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleCropSelection}
                    className="mt-4 py-2 px-6 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Select for Cropping
                  </button>
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
