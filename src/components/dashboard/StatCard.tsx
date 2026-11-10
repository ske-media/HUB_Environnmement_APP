import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkline } from './Sparkline';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  isLoading: boolean;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  trend?: string;
  trendValue?: number;
  sparklineData?: number[];
  index?: number; // Pour stagger animation
}

const colorConfig = {
  blue: {
    gradient: 'from-primary/20 via-primary-600/20 to-primary-700/20',
    border: 'border-primary/30',
    iconColor: 'text-primary',
    glow: 'shadow-indigo-glow',
  },
  green: {
    gradient: 'from-success/20 via-success/60 to-success/80',
    border: 'border-success/30',
    iconColor: 'text-success',
    glow: 'shadow-success-glow',
  },
  orange: {
    gradient: 'from-warning/20 via-warning/60 to-warning/80',
    border: 'border-warning/30',
    iconColor: 'text-warning',
    glow: 'shadow-warning-glow',
  },
  purple: {
    gradient: 'from-secondary/20 via-secondary/60 to-secondary/80',
    border: 'border-secondary/30',
    iconColor: 'text-secondary',
    glow: 'shadow-indigo-glow',
  },
};

export function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  isLoading,
  color = 'blue',
  trend,
  trendValue,
  sparklineData,
  index = 0
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const colors = colorConfig[color];

  // Animation du compteur
  useEffect(() => {
    if (!isLoading && value > 0) {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      const stepDuration = duration / steps;
      
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, stepDuration);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(0);
    }
  }, [value, isLoading]);

  // Skeleton au lieu de Spinner
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
        className="glass-panel-lg p-6 rounded-2xl"
      >
        <div className="space-y-4">
          <Skeleton className="w-14 h-14" variant="circular" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-4 w-32" variant="text" />
          </div>
          {sparklineData && <Skeleton className="h-10 w-full" />}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        "glass-panel-lg p-6 rounded-2xl transition-all duration-300",
        "bg-gradient-to-br", colors.gradient,
        "border", colors.border,
        colors.glow
      )}
    >
      <div className="space-y-4">
        {/* Icône avec dégradé subtil */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br", colors.gradient,
            "border", colors.border,
            colors.glow
          )}
        >
          <Icon className={cn("h-7 w-7", colors.iconColor)} />
        </motion.div>
        
        {/* Valeur principale */}
        <div>
          <motion.div
            key={displayValue}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight"
          >
            {displayValue.toLocaleString('fr-FR')}
          </motion.div>
          <p className="text-body text-muted-foreground font-medium mt-2">
            {title}
          </p>
        </div>

        {/* Tendance avec indicateur visuel */}
        {(trend || trendValue !== undefined) && (
          <div className="flex items-center gap-2">
            {trendValue !== undefined && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-1",
                  trendValue > 0 ? "text-success" : trendValue < 0 ? "text-error" : "text-muted-foreground"
                )}
              >
                {trendValue > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : trendValue < 0 ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span className="text-caption font-semibold">
                  {Math.abs(trendValue)}%
                </span>
              </motion.div>
            )}
            {trend && (
              <span className="text-caption text-muted-foreground">
                {trend}
              </span>
            )}
          </div>
        )}
        
        {/* Sparkline micro-graphique */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 -mx-6 -mb-6">
            <Sparkline 
              data={sparklineData} 
              color={color === 'blue' ? 'hsl(var(--primary))' : color === 'green' ? 'hsl(var(--success))' : color === 'orange' ? 'hsl(var(--warning))' : 'hsl(var(--secondary))'}
              height={40}
              className="rounded-b-2xl"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
