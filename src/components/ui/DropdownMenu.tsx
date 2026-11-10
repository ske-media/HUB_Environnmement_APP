import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DropdownMenu({
  children,
  trigger,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    if (open) {
      const timeoutId = window.setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open]);

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/15 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'absolute z-50 mt-2 min-w-[200px] rounded-2xl border border-primary/25 bg-gradient-to-br from-background/95 via-background/90 to-primary/10 shadow-2xl shadow-primary/20 supports-[backdrop-filter]:backdrop-blur-xl',
                align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
                className
              )}
              role="menu"
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('[role="menuitem"]')) setOpen(false);
              }}
            >
              <div className="max-h-[60vh] overflow-y-auto py-2">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function DropdownMenuItem({
  children,
  icon,
  variant = 'default',
  className,
  ...props
}: DropdownMenuItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-body transition-all duration-200 rounded-lg mx-2',
        'hover:bg-white/10 dark:hover:bg-surface-300/20',
        'focus:bg-white/10 dark:focus:bg-surface-300/20 focus:outline-none',
        variant === 'destructive' &&
          'text-error hover:text-error-foreground hover:bg-error/10',
        className
      )}
      role="menuitem"
      {...props}
    >
      {icon && <span className="h-4 w-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left font-medium">{children}</span>
    </motion.button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div 
      className={cn('my-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent', className)} 
      role="separator" 
    />
  );
}
