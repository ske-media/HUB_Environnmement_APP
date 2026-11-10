import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

export type MessageDialogType = 'success' | 'error' | 'warning' | 'info';

interface MessageDialogProps {
  isOpen: boolean;
  type: MessageDialogType;
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function MessageDialog({
  isOpen,
  type,
  title,
  message,
  buttonText = 'OK',
  onClose,
}: MessageDialogProps) {
  const variantConfig = {
    success: {
      icon: CheckCircle,
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
      iconGlow: 'shadow-success-glow',
      buttonVariant: 'primary' as const,
    },
    error: {
      icon: XCircle,
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

  const defaultTitles = {
    success: 'Succès',
    error: 'Erreur',
    warning: 'Attention',
    info: 'Information',
  };

  const displayTitle = title || defaultTitles[type];
  const config = variantConfig[type];
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
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
              type === 'error' ? 'border-error/30' :
              type === 'warning' ? 'border-warning/30' :
              type === 'success' ? 'border-success/30' :
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
              {displayTitle}
            </h3>
            <p className="text-body text-muted-foreground max-w-sm whitespace-pre-line">
              {message}
            </p>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full sm:w-auto"
          >
            <Button
              variant={config.buttonVariant}
              onClick={onClose}
              size="lg"
              className="w-full sm:w-auto min-h-[44px]"
            >
              {buttonText}
            </Button>
          </motion.div>
        </motion.div>
      </CardContent>
    </Modal>
  );
}
