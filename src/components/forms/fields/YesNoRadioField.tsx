import { Control, Controller, FieldErrors, FieldValues, Path } from 'react-hook-form';
import { AlertCircle, Check, CheckCircle2, XCircle } from 'lucide-react';
import { getNestedError } from '../../../lib/utils';
import { cn } from '@/lib/utils';

interface YesNoRadioFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label: string;
  control: Control<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  isRequired?: boolean;
  className?: string;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Champ radio Oui/Non qui écrit un boolean dans le formulaire (via Controller)
 * pour rester compatible avec les schémas Zod `z.boolean()`.
 *
 * Deux cartes Oui (vert) / Non (rouge), dans le même style que `RadioCardField`.
 * Remplace les cases à cocher seules, qui ne distinguaient pas « Non » de
 * « non renseigné ».
 */
export function YesNoRadioField<TFieldValues extends FieldValues>({
  name,
  label,
  control,
  errors,
  isRequired = false,
  className = '',
  yesLabel = 'Oui',
  noLabel = 'Non',
}: YesNoRadioFieldProps<TFieldValues>) {
  const error = getNestedError(errors as FieldErrors, name as string);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground dark:text-white">
        {label} {isRequired && <span className="text-destructive">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange, name: fieldName } }) => {
          const boolValue = value === true;
          const noSelected = value === false;

          const renderOption = (optionValue: boolean) => {
            const isSelected = optionValue ? boolValue : noSelected;
            const inputId = `${fieldName}-${optionValue ? 'oui' : 'non'}`;
            const Icon = optionValue ? CheckCircle2 : XCircle;
            const optionLabel = optionValue ? yesLabel : noLabel;
            const activeClass = optionValue
              ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
              : 'border-rose-500 bg-rose-500/10 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]';
            const iconClass = isSelected
              ? optionValue
                ? 'text-emerald-500'
                : 'text-rose-500'
              : 'text-muted-foreground';

            return (
              <div key={inputId} className="relative">
                <input
                  type="radio"
                  id={inputId}
                  name={fieldName}
                  checked={isSelected}
                  onChange={() => onChange(optionValue)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 min-h-[80px]',
                    'cursor-pointer transition-all duration-200 glass-panel',
                    'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20',
                    isSelected
                      ? activeClass
                      : 'border-surface-300 dark:border-surface-600 hover:border-primary/50',
                    error && !isSelected && 'border-destructive/60',
                  )}
                >
                  <Icon className={cn('h-6 w-6 transition-colors duration-200', iconClass)} />
                  <span
                    className={cn(
                      'text-sm font-medium text-center',
                      isSelected
                        ? optionValue
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        : 'text-foreground',
                    )}
                  >
                    {optionLabel}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full flex items-center justify-center',
                          optionValue ? 'bg-emerald-500' : 'bg-rose-500',
                        )}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </label>
              </div>
            );
          };

          return (
            <div className="grid grid-cols-2 gap-3">
              {renderOption(true)}
              {renderOption(false)}
            </div>
          );
        }}
      />
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5 animate-enter">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error.message as string}</span>
        </p>
      )}
    </div>
  );
}
