import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  options: SelectOption[];
  isRequired?: boolean;
  className?: string;
  placeholder?: string;
}

export function SelectField({
  name,
  label,
  register,
  errors,
  options,
  isRequired = false,
  className = '',
  placeholder = 'Sélectionner...'
}: SelectFieldProps) {
  const error = getNestedError(errors, name);

  const formatOptionLabel = (label: string): string => {
    const normalized = label.replace(/_/g, ' ').trim();
    if (!normalized) return label;

    // Si le libellé est entièrement en minuscule, on le passe en "Title Case"
    // pour une lecture plus confortable sur mobile.
    if (normalized === normalized.toLowerCase()) {
      return normalized.replace(/\b\p{L}/gu, (char) => char.toUpperCase());
    }

    return normalized;
  };
  
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground dark:text-white">
        {label} {isRequired && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <select 
          {...register(name)} 
          className={cn(
            'w-full px-4 py-4 md:py-3 text-base md:text-sm font-medium rounded-lg border appearance-none min-h-[44px]',
            'bg-background dark:bg-surface-200 text-foreground',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'transition-all duration-300 ease-in-out',
            'border-surface-300 dark:border-white/10',
            'hover:border-primary/50',
            'pr-10', // Espace pour l'icône
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20 pr-16'
          )}
        >
          <option value="">{formatOptionLabel(placeholder)}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {formatOptionLabel(option.label)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {error && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
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
