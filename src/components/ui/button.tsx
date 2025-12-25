/**
 * Button Component
 * 
 * Simple styled button with variants.
 * Light-mode only styling with Tailwind.
 * 
 * Usage:
 * <Button variant="default">Click me</Button>
 * <Button variant="outline" size="sm">Small outline</Button>
 */

import { splitProps, type JSX, type ParentComponent } from "solid-js";
import { cn } from "~/lib/utils";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const buttonVariants: Record<string, string> = {
  default: "bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900",
  outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400",
  ghost: "text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400",
  destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
};

const buttonSizes: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-sm",
  lg: "h-12 px-6 text-lg",
  icon: "h-10 w-10",
};

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ["variant", "size", "class", "children"]);
  
  const variantClass = () => buttonVariants[local.variant || "default"];
  const sizeClass = () => buttonSizes[local.size || "default"];

  return (
    <button
      class={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClass(),
        sizeClass(),
        local.class
      )}
      {...others}
    >
      {local.children}
    </button>
  );
};
