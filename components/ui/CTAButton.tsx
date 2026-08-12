import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const ctaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-heading font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:scale-[1.02] hover:shadow-lg",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm hover:from-brand-700 hover:to-brand-700",
        whatsapp: "bg-whatsapp text-night-900 hover:brightness-95",
        outline:
          "border border-night-900/15 bg-white text-night-900 hover:border-brand-600/40 hover:bg-surface-50 dark:border-white/15 dark:bg-night-900 dark:text-white dark:hover:border-brand-400/40 dark:hover:bg-night-800",
        ghost: "text-night-900 hover:bg-night-900/5 dark:text-white dark:hover:bg-white/10",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        default: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface CTAButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof ctaButtonVariants> {
  asChild?: boolean;
}

/** Botón de conversión de la vitrina (gradiente brand, WhatsApp, outline, ghost). */
const CTAButton = React.forwardRef<HTMLButtonElement, CTAButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(ctaButtonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
CTAButton.displayName = "CTAButton";

export { CTAButton, ctaButtonVariants };
