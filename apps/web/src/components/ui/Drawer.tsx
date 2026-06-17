'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  footer,
}: DrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when drawer is open and handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      // Focus the drawer when opened for accessibility
      // Use setTimeout to ensure the element is mounted and ready for focus
      const timer = setTimeout(() => drawerRef.current?.focus(), 50);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }

    // Cleanup when component unmounts or isOpen becomes false
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Render to body (Portal) to ensure it stays on top
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-brand-deep border-l border-white/10 shadow-2xl z-50 flex flex-col focus:outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2
                id={titleId}
                className="text-xl font-bold text-white tracking-tight"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-white/10 bg-brand-deep">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
