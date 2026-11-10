import { useEffect, useRef, useState, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { NavigationConfirmDialog } from '../components/NavigationConfirmDialog';

interface NavigationBlockerOptions {
  shouldBlock: boolean;
  message?: string;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
}

/**
 * Hook personnalisé pour bloquer la navigation lorsqu'il y a des modifications non sauvegardées
 * Utilise une modale personnalisée au lieu de window.confirm()
 */
export function useNavigationBlocker({
  shouldBlock,
  message = 'Vous avez des modifications non sauvegardées.',
  onSave,
  isSaving = false,
}: NavigationBlockerOptions) {
  const blocker = useBlocker(shouldBlock && !isSaving);
  const messageRef = useRef(message);
  const onSaveRef = useRef(onSave);
  const isResolvingNavigationRef = useRef(false);

  const [showDialog, setShowDialog] = useState(false);

  // Mettre à jour les refs
  useEffect(() => {
    messageRef.current = message;
    onSaveRef.current = onSave;
  }, [shouldBlock, message, onSave]);

  useEffect(() => {
    if (!shouldBlock && !isResolvingNavigationRef.current) {
      if (blocker.state === 'blocked') {
        blocker.reset();
      }
      setShowDialog(false);
    }
  }, [shouldBlock, blocker]);

  useEffect(() => {
    setShowDialog(blocker.state === 'blocked');
  }, [blocker.state]);

  // Fonction pour gérer la confirmation de navigation
  const handleNavigationConfirm = useCallback(async (action: 'cancel' | 'leave' | 'save') => {
    if (action === 'cancel') {
      if (blocker.state === 'blocked') {
        blocker.reset();
      }
      setShowDialog(false);
      return;
    }

    if (action === 'save' && onSaveRef.current) {
      isResolvingNavigationRef.current = true;
      try {
        await onSaveRef.current();
        if (blocker.state === 'blocked') {
          blocker.proceed();
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde avant navigation:', error);
      } finally {
        isResolvingNavigationRef.current = false;
        setShowDialog(false);
      }
      return;
    }

    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
    setShowDialog(false);
  }, [blocker]);

  return (
    <NavigationConfirmDialog
      isOpen={showDialog}
      message={messageRef.current}
      onCancel={() => handleNavigationConfirm('cancel')}
      onLeaveWithoutSaving={() => handleNavigationConfirm('leave')}
      onSaveAndLeave={() => handleNavigationConfirm('save')}
      isSaving={isSaving}
    />
  );
}
