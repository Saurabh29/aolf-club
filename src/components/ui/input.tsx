import { cn } from "~/lib/utils";
import type { JSX, Component } from "solid-js";
import { splitProps } from "solid-js";

/**
 * Input component following solid-ui patterns
 * Light-mode only styling - no dark: variants
 */

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "type"]);

  return (
    <input
      type={local.type || "text"}
      class={cn(
        "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900",
        "ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-gray-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        local.class
      )}
      {...others}
    />
  );
};
