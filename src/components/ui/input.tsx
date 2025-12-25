/**
 * Input Component
 * 
 * Styled text input with light-mode only styling.
 * 
 * Usage:
 * <Input type="text" placeholder="Enter name..." />
 */

import { splitProps, type JSX, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <input
      class={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2",
        "text-sm text-gray-900 placeholder:text-gray-500",
        "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        local.class
      )}
      {...rest}
    />
  );
};
