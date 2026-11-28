import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoGrow?: boolean;
  maxAutoHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = true, maxAutoHeight = 320, onChange, value, defaultValue, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const assignRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const syncHeight = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = 'auto';
      const nextHeight = Math.min(el.scrollHeight + 2, maxAutoHeight);
      if (nextHeight > 0) {
        el.style.height = `${nextHeight}px`;
      }
    }, [autoGrow, maxAutoHeight]);

    React.useLayoutEffect(() => {
      syncHeight();
    }, [defaultValue, syncHeight, value]);

    return (
      <textarea
        ref={assignRef}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          onChange?.(event);
          syncHeight();
        }}
        className={cn(
          'flex min-h-[116px] w-full rounded-xl border border-border/85 bg-background px-4 py-3.5',
          'text-[16px] leading-[1.8] tracking-[0.01em] text-foreground/95 caret-foreground',
          'md:text-[14px] md:leading-[1.75]',
          'placeholder:text-muted-foreground/55 selection:bg-foreground/10',
          'hover:border-foreground/25',
          'focus-visible:border-foreground/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/[0.06]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'resize-none overflow-y-auto transition-[border-color,box-shadow,background-color] duration-200',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
