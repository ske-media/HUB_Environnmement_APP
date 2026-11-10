import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { AlertCircle, Check, LucideIcon } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface CheckboxCardOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

interface CheckboxCardFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  options: CheckboxCardOption[];
  isRequired?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function CheckboxCardField({
  name,
  label,
  register,
  watch,
  errors,
  options,
  isRequired = false,
  className = '',
  columns = 3,
}: CheckboxCardFieldProps) {
  const error = getNestedError(errors, name);
  const selectedValues = watch(name) || {};
  
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground dark:text-white">
        {label} {isRequired && <span className="text-destructive">*</span>}
      </label>
      <div className={cn('grid gap-3', gridCols[columns])}>
        {options.map((option) => {
          const isSelected = selectedValues[option.value] === true;
          const inputId = `${name}.${option.value}`;
          
          return (
            <div key={option.value} className="relative">
              <input
                type="checkbox"
                id={inputId}
                {...register(`${name}.${option.value}`)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 min-h-[80px]',
                  'cursor-pointer transition-all duration-200',
                  'glass-panel',
                  'hover:border-primary/50 hover:shadow-indigo-glow',
                  'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-indigo-glow'
                    : 'border-surface-300 dark:border-surface-600',
                  error && 'border-destructive'
                )}
              >
                {option.icon && (() => {
                  const Icon = option.icon;
                  return (
                    <Icon className={cn(
                      'h-6 w-6 transition-colors duration-200',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  );
                })()}
                <span className={cn(
                  'text-sm font-medium text-center',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-muted-foreground text-center">
                    {option.description}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </label>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5 animate-enter">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error.message}</span>
        </p>
      )}
    </div>
  );
}
