import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 
          'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-indigo hover:shadow-indigo-lg',
        secondary:
          'glass-panel border border-primary/15 text-foreground hover:border-primary/30 hover:bg-white/80 dark:hover:bg-surface-300/40',
        destructive:
          'bg-gradient-to-r from-error to-error/85 text-error-foreground shadow-error-glow hover:shadow-error-glow',
        ghost:
          'text-muted-foreground hover:bg-white/60 dark:hover:bg-surface-300/30 hover:text-foreground',
        link: 
          'text-primary underline-offset-4 hover:underline hover:text-primary-600',
      },
      size: {
        sm: 'h-9 px-4 text-xs min-h-[36px]',
        md: 'h-11 px-5 text-sm min-h-[44px]',
        lg: 'h-12 px-6 text-base min-h-[48px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, loadingText, children, disabled, onClick, ...props }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, className }),
          (loading || disabled) && 'cursor-not-allowed'
        )}
        disabled={isDisabled}
        onClick={onClick}
        whileHover={!isDisabled ? { y: -1 } : {}}
        whileTap={!isDisabled ? { y: 0 } : {}}
        {...props}
      >
        <span className="flex items-center">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
              {loadingText || children}
            </>
          ) : (
            children
          )}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
