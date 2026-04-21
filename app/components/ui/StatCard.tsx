import { LucideIcon } from 'lucide-react';
import { cn } from './Button';

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
        <div className={cn(
            "rounded-2xl border border-gray-200/60 bg-white text-card-foreground shadow-sm p-6 card-premium group relative overflow-hidden",
            className
        )}>
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/50 group-hover:to-violet-50/30 transition-all duration-500 rounded-2xl" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="tracking-tight text-sm font-medium text-slate-500">
                        {label}
                    </h3>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center group-hover:from-indigo-100 group-hover:to-violet-100 transition-colors duration-300">
                        <Icon className="h-[18px] w-[18px] text-indigo-600" />
                    </div>
                </div>
                <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-slate-800 tracking-tight">{value}</div>
                    {trend && (
                        <div className={cn(
                            "text-xs font-semibold flex items-center px-2 py-1 rounded-full",
                            trend.positive 
                                ? "text-emerald-700 bg-emerald-50" 
                                : "text-red-700 bg-red-50"
                        )}>
                            {trend.positive ? '+' : ''}{trend.value}%
                            <span className="ml-1 text-slate-500 font-normal">{trend.label}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
