import React, { useState, useEffect, useRef } from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useDeviceContext } from '../../../hooks/useDeviceContext';

interface BarcodeScannerFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  isRequired?: boolean;
  className?: string;
  placeholder?: string;
  setValue: (name: string, value: string) => void;
}

export function BarcodeScannerField({
  name,
  label,
  register,
  errors,
  isRequired = false,
  className = '',
  placeholder = 'Saisir ou scanner le code-barres',
  setValue,
}: BarcodeScannerFieldProps) {
  const error = getNestedError(errors, name);
  const { isMobile } = useDeviceContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = `scanner-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Nettoyer le scanner lors du démontage ou de la fermeture de la modale
  useEffect(() => {
    if (!isModalOpen && scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Erreur lors du nettoyage du scanner:', err);
      }
    }
  }, [isModalOpen]);

  // Nettoyer lors du démontage du composant
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (err) {
          console.error('Erreur lors du nettoyage du scanner:', err);
        }
      }
    };
  }, []);

  const handleScanClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Erreur lors de l\'arrêt du scanner:', err);
      }
    }
    setIsModalOpen(false);
  };

  const initializeScanner = () => {
    // Attendre que le DOM soit prêt
    setTimeout(() => {
      const element = document.getElementById(scannerElementId);
      if (!element || scannerRef.current) {
        return;
      }

      try {
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        const html5QrcodeScanner = new Html5QrcodeScanner(
          scannerElementId,
          config,
          false // verbose
        );

        html5QrcodeScanner.render(
          (decodedText: string) => {
            // Code détecté avec succès
            setValue(name, decodedText);
            handleCloseModal();
          },
          (errorMessage: string) => {
            // Erreur de scan (ignorée silencieusement, le scanner continue)
            // On ne log que les erreurs critiques
            if (!errorMessage.includes('NotFoundException')) {
              // Ignorer les "NotFoundException" qui sont normales pendant le scan
            }
          }
        );

        scannerRef.current = html5QrcodeScanner;
      } catch (err) {
        console.error('Erreur lors de l\'initialisation du scanner:', err);
        alert('Impossible d\'initialiser le scanner. Vérifiez que la caméra est disponible.');
        handleCloseModal();
      }
    }, 100);
  };

  // Initialiser le scanner quand la modale s'ouvre
  useEffect(() => {
    if (isModalOpen) {
      initializeScanner();
    }
  }, [isModalOpen]);

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <label className="block text-sm font-medium text-foreground dark:text-white">
          {label} {isRequired && <span className="text-destructive">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            {...register(name)}
            type="text"
            placeholder={placeholder}
            className={cn(
              'flex-1 px-4 py-3 text-sm rounded-lg border min-h-[44px]',
              'bg-background dark:bg-surface-200 text-foreground',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-300 ease-in-out',
              'border-surface-300 dark:border-white/10',
              'hover:border-primary/50',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20'
            )}
          />
          {isMobile && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleScanClick}
              className="min-h-[44px] px-4"
              aria-label="Scanner le code-barres"
            >
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Scanner</span>
            </Button>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-destructive animate-enter mt-1">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error.message}</span>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        className="max-w-md"
        closeOnOverlayClick={true}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Scanner le code-barres
          </h3>
          <div
            id={scannerElementId}
            className="w-full"
            style={{ minHeight: '300px' }}
          />
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Pointez la caméra vers le code-barres
          </p>
        </div>
      </Modal>
    </>
  );
}
