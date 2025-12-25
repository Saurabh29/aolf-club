import { cn } from "~/lib/utils";
import type { JSX, Component } from "solid-js";
import { splitProps } from "solid-js";

/**
 * Label component following solid-ui patterns
 * Light-mode only styling - no dark: variants
 */

export interface LabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: Component<LabelProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <label
      class={cn(
        "text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class
      )}
      {...others}
    >
      {local.children}
    </label>
  );
};
