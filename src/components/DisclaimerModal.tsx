import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Simple Focus trapping
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Small timeout to allow animation to start
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          onKeyDown={handleTabKey}
        >
          {/* Backdrop with motion fade */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            onClick={onClose}
          />

          {/* Modal Container with motion scale and fade */}
          <motion.div 
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-panel relative w-full max-w-xl rounded-2xl bg-slate-900/95 shadow-2xl border border-white/10 p-6 md:p-8 overflow-hidden"
          >
            {/* Ambient background glow decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Close (X) Button */}
            <button 
              ref={closeButtonRef}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-150 outline-none focus:ring-2 focus:ring-cyan-500/50"
              aria-label="Close Disclaimer Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5 mt-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 id="disclaimer-title" className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Disclaimer
              </h2>
            </div>

            {/* Scrollable Content Area */}
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 select-text">
              <p>
                BD-TV does not host, upload, store, or stream any video content on its own servers. All television channels and streaming links displayed on this website are collected from publicly available sources, open-source IPTV playlists, and freely accessible links found on the internet. We do not claim ownership of any stream, channel, logo, trademark, or copyrighted content displayed through the platform.
              </p>
              <p>
                BD-TV acts solely as a content aggregator and directory for publicly available streams. If you are the owner of any content and believe your rights have been violated, please contact the original content provider or stream host directly.
              </p>
              <p>
                By using this website, you acknowledge that BD-TV is not responsible for the availability, legality, accuracy, or quality of any third-party stream.
              </p>
            </div>

            {/* Footer button inside modal */}
            <div className="flex justify-end border-t border-white/5 pt-5 mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-400/20"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
