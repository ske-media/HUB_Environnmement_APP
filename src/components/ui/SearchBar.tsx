import { Search, Command } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showShortcut?: boolean;
  onShortcutPress?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className,
  showShortcut = true,
  onShortcutPress,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Détecter si l'utilisateur est sur Mac
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K ou Ctrl+K pour focus la recherche
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        onShortcutPress?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShortcutPress]);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "block w-full pl-12 pr-20 py-3 text-base",
          "bg-white/5 dark:bg-surface-200/10",
          "border border-white/10 dark:border-surface-600",
          "rounded-2xl",
          "text-foreground placeholder-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
          "focus:bg-white/10 dark:focus:bg-surface-200/20",
          "backdrop-blur-sm transition-all duration-200",
          "font-medium"
        )}
      />
      {showShortcut && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 dark:bg-surface-300/20 border border-white/10 dark:border-surface-600 text-xs text-muted-foreground font-mono">
            {isMac ? (
              <>
                <Command className="h-3 w-3" />
                <span>K</span>
              </>
            ) : (
              <>
                <span>Ctrl</span>
                <span>K</span>
              </>
            )}
          </kbd>
        </div>
      )}
    </div>
  );
}

