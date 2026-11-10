import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface SwitchFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors?: FieldErrors;
  className?: string;
  description?: string;
}

export function SwitchField({
  name,
  label,
  register,
  errors,
  className = '',
  description,
}: SwitchFieldProps) {
  const error = getNestedError(errors, name);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor={name} className="block text-sm font-medium text-foreground dark:text-white cursor-pointer">
            {label}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="relative">
          <input
            type="checkbox"
            id={name}
            {...register(name)}
            className="peer sr-only"
          />
          <label
            htmlFor={name}
            className={cn(
              'relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-colors duration-200',
              'bg-surface-300 dark:bg-surface-700',
              'peer-checked:bg-primary',
              'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 peer-focus:ring-offset-2',
              error && 'ring-2 ring-destructive/50'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200',
                'translate-x-1',
                'peer-checked:translate-x-6',
                'shadow-md'
              )}
            />
          </label>
        </div>
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

