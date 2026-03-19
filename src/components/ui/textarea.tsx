import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[112px] w-full rounded-2xl border border-input bg-muted/55 px-4 py-3 text-base text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.015)] ring-offset-background placeholder:text-text-muted focus-visible:border-primary/70 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};

