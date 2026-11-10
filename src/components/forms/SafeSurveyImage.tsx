import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isSafePhotoLinkHref,
  shouldShowPhotoPlaceholder,
  STALE_BLOB_PLACEHOLDER_MESSAGE,
} from '@/lib/safePhotoUrl';

interface SafeSurveyImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  /** true si l'URL blob provient d'un fichier sélectionné dans la session courante */
  isLocallyCreated?: boolean;
  placeholderMessage?: string;
  /** Si fourni et que l'URL est sûre, enveloppe l'image dans un lien externe */
  linkHref?: string | null;
}

export function SafeSurveyImage({
  src,
  alt,
  className,
  isLocallyCreated = false,
  placeholderMessage = STALE_BLOB_PLACEHOLDER_MESSAGE,
  linkHref,
}: SafeSurveyImageProps) {
  const [hasLoadError, setHasLoadError] = useState(false);

  if (shouldShowPhotoPlaceholder(src, isLocallyCreated, hasLoadError)) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground p-4 text-center',
          className
        )}
        role="img"
        aria-label={placeholderMessage}
      >
        <ImageOff className="h-6 w-6 shrink-0 opacity-60" aria-hidden="true" />
        <p className="text-xs leading-snug">{placeholderMessage}</p>
      </div>
    );
  }

  const image = (
    <img
      src={src!}
      alt={alt}
      className={className}
      onError={() => setHasLoadError(true)}
    />
  );

  const safeHref = linkHref && isSafePhotoLinkHref(linkHref) ? linkHref : null;
  if (safeHref) {
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="inline-block">
        {image}
      </a>
    );
  }

  return image;
}
