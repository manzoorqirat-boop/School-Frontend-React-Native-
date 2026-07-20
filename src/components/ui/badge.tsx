import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
        warning: 'border-transparent bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        muted: 'border-transparent bg-muted text-muted-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
