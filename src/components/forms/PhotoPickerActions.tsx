import { useState } from 'react';
import { Camera, FolderOpen, ImageIcon, Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import type { PhotoSource } from '../../lib/photoSource';
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetClose } from '../ui/Sheet';

interface PhotoPickerActionsProps {
  onOpenSource: (source: PhotoSource) => void;
  variant?: 'zone' | 'compact';
  className?: string;
}

function PickerButton({
  onClick,
  icon: Icon,
  label,
  description,
  variant,
  className,
}: {
  onClick: () => void;
  icon: typeof Camera;
  label: string;
  description?: string;
  variant: 'zone' | 'compact';
  className?: string;
}) {
  const isZone = variant === 'zone';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl transition-all duration-200',
        'border-2 border-primary/25 dark:border-primary/35 bg-background/80 dark:bg-background/40',
        'hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/20',
        'active:border-primary active:bg-primary/15 dark:active:bg-primary/25',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isZone
          ? 'gap-1.5 min-h-[72px] sm:min-h-[80px] px-3 py-3'
          : 'gap-1 min-h-[56px] sm:min-h-[60px] px-2 py-2 border',
        className
      )}
    >
      <Icon
        className={cn(
          'text-primary shrink-0',
          isZone ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-4 w-4 sm:h-5 sm:w-5'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'font-semibold leading-tight text-center',
          isZone ? 'text-sm text-foreground' : 'text-xs sm:text-sm text-primary'
        )}
      >
        {label}
      </span>
      {description && isZone && (
        <span className="text-[11px] sm:text-xs text-muted-foreground leading-tight text-center hidden sm:block">
          {description}
        </span>
      )}
    </button>
  );
}

/**
 * Boutons de sélection photo adaptés au contexte :
 * - Desktop : un seul bouton « Media » (Finder / explorateur)
 * - Mobile / tablette : « Photo » + « Media » (galerie ou fichiers)
 */
export function PhotoPickerActions({
  onOpenSource,
  variant = 'zone',
  className,
}: PhotoPickerActionsProps) {
  const { isDesktop } = useDeviceContext();
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false);

  const openGallery = () => {
    setMediaSheetOpen(false);
    onOpenSource('gallery');
  };

  const openFiles = () => {
    setMediaSheetOpen(false);
    onOpenSource('files');
  };

  if (isDesktop) {
    return (
      <div className={cn('w-full flex justify-center', className)}>
        <PickerButton
          variant={variant}
          icon={Images}
          label="Media"
          description="Parcourir vos fichiers"
          onClick={() => onOpenSource('files')}
          className={variant === 'zone' ? 'w-full max-w-xs' : 'w-full max-w-[200px]'}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:gap-3 w-full',
          variant === 'zone' ? 'max-w-xl' : undefined,
          className
        )}
      >
        <PickerButton
          variant={variant}
          icon={Camera}
          label={variant === 'zone' ? 'Prendre une photo' : 'Photo'}
          description="Ouvrir l'appareil photo"
          onClick={() => onOpenSource('camera')}
        />
        <PickerButton
          variant={variant}
          icon={Images}
          label="Media"
          description="Galerie ou fichiers"
          onClick={() => setMediaSheetOpen(true)}
        />
      </div>

      <Sheet open={mediaSheetOpen} onOpenChange={setMediaSheetOpen} side="bottom">
        <SheetHeader showDragIndicator>
          <SheetTitle>Importer une photo</SheetTitle>
          <SheetClose onClose={() => setMediaSheetOpen(false)} />
        </SheetHeader>
        <SheetContent>
          <div className="grid grid-cols-1 gap-3 pb-4">
            <button
              type="button"
              onClick={openGallery}
              className={cn(
                'flex items-center gap-4 w-full min-h-[64px] px-4 py-3 rounded-xl',
                'border-2 border-primary/25 bg-background/80',
                'hover:border-primary hover:bg-primary/10 active:bg-primary/15',
                'transition-all duration-200'
              )}
            >
              <ImageIcon className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Galerie</p>
                <p className="text-xs text-muted-foreground">Pellicule / bibliothèque photos</p>
              </div>
            </button>
            <button
              type="button"
              onClick={openFiles}
              className={cn(
                'flex items-center gap-4 w-full min-h-[64px] px-4 py-3 rounded-xl',
                'border-2 border-primary/25 bg-background/80',
                'hover:border-primary hover:bg-primary/10 active:bg-primary/15',
                'transition-all duration-200'
              )}
            >
              <FolderOpen className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Fichiers</p>
                <p className="text-xs text-muted-foreground">Parcourir le gestionnaire de fichiers</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
