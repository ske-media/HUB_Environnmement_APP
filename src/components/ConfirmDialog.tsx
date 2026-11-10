import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-error/20',
      iconColor: 'text-error',
      iconGlow: 'shadow-error-glow',
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
      iconGlow: 'shadow-warning-glow',
      buttonVariant: 'destructive' as const,
    },
    info: {
      icon: Info,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      iconGlow: 'shadow-indigo-glow',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      showCloseButton={false}
      closeOnOverlayClick={true}
    >
      <CardContent className="pt-6 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Icône avec animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'flex items-center justify-center w-20 h-20 rounded-full border-2',
              config.iconBg,
              config.iconColor.includes('error') ? 'border-error/30' :
              config.iconColor.includes('warning') ? 'border-warning/30' :
              'border-primary/30',
              config.iconGlow
            )}
          >
            <Icon className={cn('h-10 w-10', config.iconColor)} />
          </motion.div>

          {/* Titre et message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-h2-lg font-bold text-foreground">
              {title}
            </h3>
            <p className="text-body text-muted-foreground max-w-sm">
              {message}
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 w-full sm:w-auto"
          >
            <Button
              variant="secondary"
              onClick={onCancel}
              size="lg"
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              {cancelText}
            </Button>
            <Button
              variant={config.buttonVariant}
              onClick={onConfirm}
              size="lg"
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              {confirmText}
            </Button>
          </motion.div>
        </motion.div>
      </CardContent>
    </Modal>
  );
}
