import { Card, CardContent, CardHeader } from '../ui/Card';
import { cn } from '../../lib/utils';

const shimmerClass =
  'animate-shimmer bg-gradient-to-r from-surface-200 via-surface-300 to-surface-200 bg-[length:200%_100%] rounded';

export function FormSkeleton() {
  return (
    <div className="space-y-8">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-enter">
          <CardHeader>
            <div className={cn('h-6 w-48', shimmerClass)}></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn('h-10 w-full', shimmerClass)}></div>
            <div className={cn('h-10 w-full', shimmerClass)}></div>
            <div className={cn('h-24 w-full', shimmerClass)}></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
