import React, { useRef } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Selection } from './types';

interface PDFViewerProps {
  uploadedFile: string | null;
  pdfViewportSize: { width: number; height: number };
  isSelecting: boolean;
  selectionStart: { x: number; y: number };
  selectionEnd: { x: number; y: number };
  activeSelection: Selection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onSelectFullArea: () => void;
  onClearSelection: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  uploadedFile,
  pdfViewportSize,
  isSelecting,
  selectionStart,
  selectionEnd,
  activeSelection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSelectFullArea,
  onClearSelection,
  onFileUpload,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 bg-blue-50">
      <div className="h-full p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800"></h2>
          {uploadedFile && (
            <div className="flex gap-2">
              <button
                onClick={onSelectFullArea}
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
                  onClick={onClearSelection}
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
        <div className=" p-20 bg-white rounded-lg shadow-md overflow-hidden">
          {uploadedFile ? (
            <div 
              ref={viewerContainerRef}
              className="relative"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
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
            <div className="w-full h-full flex items-center justify-center ">
              <div className="text-center rounded-lg border-2 border-dashed border-gray-300 bg-black bg-opacity-5 p-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-600 text-lg font-medium mb-1">No document uploaded</p>
                <p className="text-gray-500 mb-4">Upload a PDF document to get started</p>
                <input
                  type="file"
                  accept=".pdf"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={onFileUpload}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
