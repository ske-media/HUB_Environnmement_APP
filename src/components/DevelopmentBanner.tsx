import { useState, useEffect } from 'react';
import { DevelopmentBlockingModal } from './DevelopmentBlockingModal';

interface DevelopmentBannerProps {
  className?: string;
}

export function DevelopmentBanner({ className }: DevelopmentBannerProps) {
  const [isBlocking, setIsBlocking] = useState(true);

  // Le modal bloque l'accès au formulaire dès le chargement
  useEffect(() => {
    setIsBlocking(true);
  }, []);

  const handleClose = () => {
    setIsBlocking(false);
  };

  return (
    <>
      <DevelopmentBlockingModal isOpen={isBlocking} onClose={handleClose} />
    </>
  );
}