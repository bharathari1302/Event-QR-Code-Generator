import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md',
            outline: 'border border-gray-200 bg-white hover:bg-gray-50 text-slate-700 shadow-sm hover:shadow-md hover:border-gray-300',
            ghost: 'hover:bg-gray-100 text-slate-600 hover:text-slate-800',
            destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-red-500/20',
            gradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5',
        };

        const sizes = {
            sm: 'h-9 px-3.5 rounded-lg text-xs',
            md: 'h-10 px-5 py-2 rounded-xl text-sm',
            lg: 'h-12 px-8 rounded-xl text-base',
            icon: 'h-10 w-10 p-2 rounded-xl',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button, cn };
