import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface InputFieldProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  type?: 'text' | 'number' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  step?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email';
}

export function InputField({
  name,
  label,
  register,
  errors,
  type = 'text',
  placeholder,
  className = '',
  isRequired = false,
  step,
  inputMode
}: InputFieldProps) {
  const error = getNestedError(errors, name);
  
  // Déterminer inputMode et pattern pour les champs numériques
  const resolvedInputMode = type === 'number' ? 'decimal' : inputMode;
  const pattern = type === 'number' ? '[0-9]*' : undefined;
  
  // Pour les champs numériques, transformer les valeurs vides en undefined
  const registerOptions = type === 'number' 
    ? {
        setValueAs: (value: string) => {
          if (value === '' || value === null || value === undefined) {
            return undefined;
          }
          const num = Number(value);
          return isNaN(num) ? undefined : num;
        }
      }
    : {};
  
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground dark:text-white">
        {label} {isRequired && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <input 
          type={type}
          step={step}
          inputMode={resolvedInputMode}
          pattern={pattern}
          {...register(name, registerOptions)} 
          className={cn(
            'w-full px-4 py-3 text-sm rounded-lg border min-h-[44px]',
            'bg-background dark:bg-surface-200 text-foreground placeholder-muted-foreground',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'transition-all duration-300 ease-in-out',
            'border-surface-300 dark:border-white/10',
            'hover:border-primary/50',
            error 
              ? 'border-destructive focus:border-destructive focus:ring-destructive/20 pr-10' 
              : ''
          )} 
          placeholder={placeholder}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
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
