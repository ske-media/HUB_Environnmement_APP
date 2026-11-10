import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = 'hsl(var(--primary))', height = 40, className }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // Éviter division par zéro
    
    const width = 100;
    const stepX = width / (data.length - 1 || 1);
    
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-xs", className)} style={{ height }}>
        Pas de données
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Zone de remplissage avec gradient */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Ligne de remplissage */}
        <path
          d={`${path} L 100,${height} L 0,${height} Z`}
          fill={`url(#gradient-${color})`}
        />
        
        {/* Ligne principale */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

