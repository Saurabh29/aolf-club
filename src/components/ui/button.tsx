import { cn } from "~/lib/utils";
import type { JSX, Component } from "solid-js";
import { splitProps } from "solid-js";

/**
 * Button component following solid-ui patterns
 * Light-mode only styling - no dark: variants
 */

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const buttonVariants = {
  default: "bg-gray-900 text-white hover:bg-gray-800",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  ghost: "hover:bg-gray-100 text-gray-900",
  link: "text-gray-900 underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
};

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ["variant", "size", "class", "children"]);

  return (
    <button
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[local.variant || "default"],
        buttonSizes[local.size || "default"],
        local.class
      )}
      {...others}
    >
      {local.children}
    </button>
  );
};
