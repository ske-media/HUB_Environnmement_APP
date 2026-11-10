import React, { useRef, useEffect } from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface TextareaFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  placeholder?: string;
  rows?: number;
  isRequired?: boolean;
  className?: string;
  autoResize?: boolean;
}

export function TextareaField({
  name,
  label,
  register,
  errors,
  placeholder,
  rows = 4,
  isRequired = false,
  className = '',
  autoResize = true,
}: TextareaFieldProps) {
  const error = getNestedError(errors, name);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref, ...registerProps } = register(name);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !autoResize) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener('input', adjustHeight);
    adjustHeight(); // Ajuster au montage

    return () => {
      textarea.removeEventListener('input', adjustHeight);
    };
  }, [autoResize]);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground dark:text-white">
        {label} {isRequired && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <textarea 
          {...registerProps}
          ref={(e) => {
            ref(e);
            textareaRef.current = e;
          }}
          rows={rows}
          className={cn(
            'w-full px-4 py-4 md:py-3 text-sm rounded-lg border min-h-[100px]',
            'bg-background dark:bg-surface-200 text-foreground placeholder-muted-foreground',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'transition-all duration-300 ease-in-out resize-y',
            'border-surface-300 dark:border-white/10',
            'hover:border-primary/50',
            autoResize && 'resize-none',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20 pr-10'
          )} 
          placeholder={placeholder}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 flex items-start pt-3 pr-3 pointer-events-none">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive animate-enter">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
