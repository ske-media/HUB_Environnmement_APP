import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

const DEVELOPMENT_MESSAGE = `Cette fonctionnalité est actuellement en cours de développement.

Certaines fonctionnalités peuvent être limitées ou incomplètes. Nous travaillons activement à améliorer cette partie de l'application.

Merci de votre compréhension.`;

interface DevelopmentBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevelopmentBlockingModal({ isOpen, onClose }: DevelopmentBlockingModalProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleGoBack}
      showCloseButton={false}
      closeOnOverlayClick={false}
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
              'bg-warning/20 border-warning/30 shadow-warning-glow'
            )}
          >
            <AlertCircle className="h-10 w-10 text-warning" />
          </motion.div>

          {/* Titre et message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-h2-lg font-bold text-foreground">
              En cours de développement
            </h3>
            <p className="text-body text-muted-foreground max-w-sm whitespace-pre-line">
              {DEVELOPMENT_MESSAGE}
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
              variant="primary"
              onClick={handleGoBack}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </motion.div>
        </motion.div>
      </CardContent>
    </Modal>
  );
}
