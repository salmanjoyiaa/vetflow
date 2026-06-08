'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { inputClass } from '@/lib/ui/dashboard-classes';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(inputClass, 'min-h-[88px] resize-y', error && 'border-destructive', className)}
        {...props}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

export default Textarea;
