import { LucideIcon } from 'lucide-react';
import { cn } from './Button'; // Import cn from Button or create a separate utils file (doing inline import for simplicity)

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
    return (
        <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6", className)}>
            <div className="flex items-center justify-between space-y-0.5">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
                    {label}
                </h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <div className={cn(
                        "text-xs font-medium flex items-center",
                        trend.positive ? "text-green-600" : "text-red-600"
                    )}>
                        {trend.positive ? '+' : ''}{trend.value}%
                        <span className="ml-1 text-muted-foreground font-normal">{trend.label}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
