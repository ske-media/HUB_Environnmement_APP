import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  // Toujours réserver l'espace pour éviter les sauts de layout
  // Hauteur fixe même quand vide (min-height)
  return (
    <nav 
      className={cn('flex min-h-[20px]', className)} 
      aria-label="Breadcrumb"
    >
      {items.length === 0 ? (
        <div className="h-5" /> // Espace réservé invisible
      ) : (
        <>
          {/* Version desktop complète */}
          <ol className="hidden sm:inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link
                to="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
              >
                <Home className="w-4 h-4" />
              </Link>
            </li>
            {items.map((item, index) => (
              <li key={index} className="inline-flex items-center">
                <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground" />
                {item.path && index < items.length - 1 ? (
                  <Link
                    to={item.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-sm text-foreground font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
          
          {/* Version mobile compacte (icône retour + dernier élément) */}
          {items.length > 0 && (
            <div className="sm:hidden flex items-center gap-2">
              <Link
                to={items[items.length - 2]?.path || '/'}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {items.length > 1 && (
                  <span className="text-sm truncate max-w-[120px]">
                    {items[items.length - 2]?.label}
                  </span>
                )}
              </Link>
            </div>
          )}
        </>
      )}
    </nav>
  );
}

