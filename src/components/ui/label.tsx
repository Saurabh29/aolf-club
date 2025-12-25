/**
 * Label Component
 * 
 * Form label with consistent styling.
 * 
 * Usage:
 * <Label for="name">Name</Label>
 */

import { splitProps, type JSX, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface LabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: Component<LabelProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <label
      class={cn(
        "text-sm font-medium text-gray-900 leading-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </label>
  );
};
