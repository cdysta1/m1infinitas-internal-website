import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-border/85 bg-background px-3.5 py-2.5',
          'text-[16px] leading-normal tracking-[0.005em] text-foreground/95 caret-foreground',
          'md:h-10 md:text-[14px]',
          'placeholder:text-muted-foreground/55 selection:bg-foreground/10',
          'hover:border-foreground/25',
          'focus-visible:border-foreground/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/[0.06]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'transition-[border-color,box-shadow,background-color] duration-200',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
