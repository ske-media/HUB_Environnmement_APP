import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'bottom';
}

export function Sheet({ open, onOpenChange, children, side = 'left' }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Bottom sheet pour mobile
  if (side === 'bottom') {
    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-xl"
              onClick={() => onOpenChange(false)}
              aria-hidden="true"
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'fixed inset-x-0 bottom-0 z-modal glass-panel-lg border-t border-white/10 shadow-indigo-glow-lg rounded-t-3xl max-h-[90vh] overflow-hidden'
              )}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-xl"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <motion.div
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed inset-y-0 z-modal w-full max-w-xs sm:max-w-sm glass-panel-lg border-r border-white/10 shadow-indigo-glow-lg',
              side === 'left' ? 'left-0' : 'right-0'
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showDragIndicator?: boolean;
}

export function SheetHeader({ children, className, showDragIndicator, ...props }: SheetHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 border-b border-white/10 px-6 py-6 relative', className)}
      {...props}
    >
      {showDragIndicator && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full"
        />
      )}
      {children}
    </div>
  );
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function SheetTitle({ children, className, ...props }: SheetTitleProps) {
  return (
    <h2 className={cn('text-h2-lg font-bold text-foreground', className)} {...props}>
      {children}
    </h2>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SheetContent({ children, className, ...props }: SheetContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-6', className)} {...props}>
      {children}
    </div>
  );
}

interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

export function SheetClose({ onClose, className, ...props }: SheetCloseProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 90 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 h-11 w-11 rounded-xl glass-panel border border-white/10 hover:bg-white/10 dark:hover:bg-surface-300/20 flex items-center justify-center transition-all duration-200',
        className
      )}
      aria-label="Fermer"
      {...props}
    >
      <X className="h-5 w-5 text-foreground" />
    </motion.button>
  );
}
