/**
 * Card Components
 * 
 * Built on @kobalte/core for accessibility.
 * Light-mode only styling with Tailwind.
 * 
 * This file exports primitive Card components.
 * For the application-level Card wrapper, see ~/components/ui/Card.tsx
 */

import { splitProps, type JSX, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface CardPrimitiveProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const CardPrimitive: Component<CardPrimitiveProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
};

export const CardHeader: Component<CardPrimitiveProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col space-y-1.5 p-6", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
};

export const CardTitle: Component<JSX.HTMLAttributes<HTMLHeadingElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <h3
      class={cn("text-lg font-semibold text-gray-900 leading-none tracking-tight", local.class)}
      {...rest}
    >
      {local.children}
    </h3>
  );
};

export const CardDescription: Component<JSX.HTMLAttributes<HTMLParagraphElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <p
      class={cn("text-sm text-gray-600", local.class)}
      {...rest}
    >
      {local.children}
    </p>
  );
};

export const CardContent: Component<CardPrimitiveProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("p-6 pt-0", local.class)} {...rest}>
      {local.children}
    </div>
  );
};

export const CardFooter: Component<CardPrimitiveProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex items-center p-6 pt-0", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
};
