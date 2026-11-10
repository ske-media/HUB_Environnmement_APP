import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  id?: string;
  number: number | string;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
  onAddRow?: () => void;
  addRowLabel?: string;
}

export function FormSection({
  id,
  number,
  title,
  icon: Icon,
  children,
  actionButton,
  onAddRow,
  addRowLabel = 'Ajouter une ligne',
}: FormSectionProps) {
  const sectionId = id || `section-${number}`;

  return (
    <Card 
      id={sectionId} 
      data-form-section="true"
      data-form-section-title={title}
      className={cn(
        "animate-enter glass-panel-lg mb-10 border border-primary/20",
        "bg-card",
        "shadow-indigo"
      )}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Icône de section */}
            {Icon && (
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            {/* Cercle coloré avec numéro de section */}
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-full font-bold text-sm flex-shrink-0">
              {number}
            </div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          </div>
          {actionButton || (onAddRow && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddRow}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addRowLabel}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}
