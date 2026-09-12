import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'gradient-primary text-white hover:shadow-glow hover:scale-105 active:scale-95',
        destructive: 'gradient-destructive text-white hover:shadow-lg hover:scale-105 active:scale-95',
        outline: 'border-2 border-blue-500 bg-transparent text-blue-600 hover:bg-blue-50 hover:border-blue-600 active:scale-95',
        secondary: 'gradient-secondary text-white hover:shadow-lg hover:scale-105 active:scale-95',
        ghost: 'hover:bg-blue-50 hover:text-blue-600 active:scale-95',
        link: 'text-blue-600 underline-offset-4 hover:underline',
        success: 'gradient-success text-white hover:shadow-lg hover:scale-105 active:scale-95',
        warning: 'gradient-warning text-white hover:shadow-lg hover:scale-105 active:scale-95',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-lg px-4 py-2',
        lg: 'h-14 rounded-xl px-8 py-4 text-base',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
