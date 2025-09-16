import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className = "" }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${
            trend.isPositive ? 'text-success' : 'text-destructive'
          }`}>
            {trend.isPositive ? '↗' : '↘'} {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}