"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use unpkg for the worker to avoid Next.js bundling issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages || 1);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  const fitToScreen = () => setScale(1);

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="w-full bg-elevated border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-aubergine-soft font-medium">
            <span className="text-gold">SkyRipple</span> Pitch Deck
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
          <button 
            onClick={previousPage} 
            disabled={pageNumber <= 1}
            className="p-1.5 text-aubergine-soft hover:text-gold hover:bg-elevated rounded-md disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-aubergine-soft transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm font-mono text-aubergine px-2 min-w-[4rem] text-center">
            {pageNumber} / {numPages || '-'}
          </span>
          
          <button 
            onClick={nextPage} 
            disabled={pageNumber >= numPages}
            className="p-1.5 text-aubergine-soft hover:text-gold hover:bg-elevated rounded-md disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-aubergine-soft transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="p-2 text-aubergine-soft hover:text-gold transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-aubergine-soft w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} className="p-2 text-aubergine-soft hover:text-gold transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={fitToScreen} className="p-2 text-aubergine-soft hover:text-gold transition-colors" title="Fit to width">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div 
        ref={containerRef}
        className="w-full bg-black/20 relative flex justify-center items-center min-h-[60vh] overflow-auto p-4 md:p-8"
        style={{ scrollbarWidth: 'thin' }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          }
          className="flex flex-col items-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pageNumber}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="shadow-xl"
            >
              <Page 
                pageNumber={pageNumber} 
                width={containerWidth ? Math.min(containerWidth - 64, 1000) * scale : undefined}
                className="rounded-lg overflow-hidden"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </motion.div>
          </AnimatePresence>
        </Document>
      </div>
    </div>
  );
}
