/**
 * Badge Component
 * 
 * Light-mode only styling with Tailwind.
 * 
 * Usage:
 * <Badge variant="default">Active</Badge>
 * <Badge variant="secondary">Inactive</Badge>
 */

import { splitProps, type JSX, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "outline";
}

const badgeVariants = {
  default: "bg-gray-900 text-white",
  secondary: "bg-gray-100 text-gray-900",
  success: "bg-green-100 text-green-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-gray-300 bg-white text-gray-900",
};

export const Badge: Component<BadgeProps> = (props) => {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);

  return (
    <span
      class={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[local.variant ?? "default"],
        local.class
      )}
      {...rest}
    >
      {local.children}
    </span>
  );
};
