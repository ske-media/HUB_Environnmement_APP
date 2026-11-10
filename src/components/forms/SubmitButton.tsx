import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
  loading: boolean;
  loadingText?: string;
  defaultText?: string;
  className?: string;
  success?: boolean;
  successDuration?: number;
}

export function SubmitButton({
  loading,
  loadingText = 'Enregistrement...',
  defaultText = 'Enregistrer la fiche',
  className = '',
  success = false,
  successDuration = 1500,
}: SubmitButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Gérer l'état de succès temporaire
  useEffect(() => {
    if (success && !loading) {
      setIsSuccess(true);
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setIsSuccess(false);
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [success, loading, successDuration]);

  return (
    <motion.div
      className={cn('relative', className)}
      animate={showSuccess ? {
        scale: [1, 1.05, 1],
      } : {}}
      transition={{ duration: 0.3 }}
    >
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        loadingText={loadingText}
        className={cn(
          'relative overflow-hidden',
          loading && 'cursor-not-allowed opacity-80 saturate-75',
          isSuccess && 'bg-gradient-to-r from-success via-success/90 to-success shadow-success-glow'
        )}
        disabled={loading || isSuccess}
      >
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10 flex items-center"
            >
              <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
              Enregistré !
            </motion.span>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10"
            >
              {defaultText}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
