import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent gradient-primary text-white shadow-sm',
        secondary: 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
        destructive: 'border-transparent gradient-destructive text-white shadow-sm',
        outline: 'border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50',
        success: 'border-transparent gradient-success text-white shadow-sm',
        warning: 'border-transparent gradient-warning text-white shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
