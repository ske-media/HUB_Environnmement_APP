import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors?: FieldErrors;
  className?: string;
}

export function CheckboxField({
  name,
  label,
  register,
  errors,
  className = ''
}: CheckboxFieldProps) {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className="relative">
        <input 
          type="checkbox" 
          {...register(name)}
          id={name}
          className="peer sr-only"
        />
        <label
          htmlFor={name}
          className={cn(
            'flex items-center justify-center w-11 h-11 md:w-5 md:h-5 rounded border-2 border-surface-300 dark:border-white/30 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',
            'bg-background dark:bg-surface-200',
            'cursor-pointer transition-all duration-200',
            'peer-checked:bg-primary peer-checked:border-primary',
            'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20',
            'hover:border-primary/50 dark:hover:border-white/50'
          )}
        >
          <Check className="h-5 w-5 md:h-3 md:w-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity duration-200" />
        </label>
      </div>
      <label 
        htmlFor={name}
        className="text-sm font-medium text-foreground dark:text-white cursor-pointer min-h-[44px] flex items-center"
      >
        {label}
      </label>
    </div>
  );
}
