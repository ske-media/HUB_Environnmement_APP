import React, { createContext, useContext, useState, useCallback } from 'react';
import { MessageDialog, MessageDialogType } from '../components/MessageDialog';

interface DialogContextType {
  showDialog: (
    type: MessageDialogType,
    message: string,
    title?: string,
    buttonText?: string
  ) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: MessageDialogType;
    title?: string;
    message: string;
    buttonText?: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const showDialog = useCallback((
    type: MessageDialogType,
    message: string,
    title?: string,
    buttonText?: string
  ) => {
    setDialogState({
      isOpen: true,
      type,
      message,
      title,
      buttonText,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <MessageDialog
        isOpen={dialogState.isOpen}
        type={dialogState.type}
        title={dialogState.title}
        message={dialogState.message}
        buttonText={dialogState.buttonText}
        onClose={closeDialog}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

