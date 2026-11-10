import React from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface NavigationConfirmDialogProps {
  isOpen: boolean;
  message?: string;
  onCancel: () => void;
  onLeaveWithoutSaving: () => void;
  onSaveAndLeave: () => void;
  isSaving?: boolean;
}

export function NavigationConfirmDialog({
  isOpen,
  message = 'Vous avez des modifications non sauvegardées.',
  onCancel,
  onLeaveWithoutSaving,
  onSaveAndLeave,
  isSaving = false,
}: NavigationConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      closeOnOverlayClick={false}
      showCloseButton={false}
      className="max-w-md"
    >
      <CardContent className="p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'relative flex items-center justify-center w-16 h-16 rounded-full',
              'bg-warning/20',
              'shadow-warning-glow'
            )}
          >
            <AlertTriangle className="w-8 h-8 text-warning" />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <h3 className="text-xl font-semibold text-foreground">
              Modifications non sauvegardées
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {message}
            </p>
            <p className="text-sm text-muted-foreground">
              Que souhaitez-vous faire ?
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3 w-full"
          >
            <Button
              variant="primary"
              onClick={onSaveAndLeave}
              size="lg"
              disabled={isSaving}
              className="w-full min-h-[44px] flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sauvegarde en cours...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder et quitter</span>
                </>
              )}
            </Button>
            
            <Button
              variant="secondary"
              onClick={onLeaveWithoutSaving}
              size="lg"
              disabled={isSaving}
              className="w-full min-h-[44px] flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Quitter sans sauvegarder</span>
            </Button>
            
            <Button
              variant="ghost"
              onClick={onCancel}
              size="lg"
              disabled={isSaving}
              className="w-full min-h-[44px]"
            >
              Annuler
            </Button>
          </motion.div>
        </motion.div>
      </CardContent>
    </Modal>
  );
}
