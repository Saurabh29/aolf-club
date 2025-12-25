/**
 * Card Wrapper Component
 * 
 * This is the CANONICAL Card component for the application.
 * All pages and content-bearing components must render their primary content
 * inside this Card wrapper.
 * 
 * This wrapper composes the primitive Card components and provides a consistent
 * interface for header, content, and actions.
 * 
 * Usage:
 * <Card header={<h2>Title</h2>} actions={<Button>Action</Button>}>
 *   <p>Card content goes here</p>
 * </Card>
 */

import { type JSX, type Component, Show, splitProps } from "solid-js";
import {
  CardPrimitive,
  CardHeader,
  CardContent,
  CardTitle,
} from "~/components/ui/card-primitives";
import { cn } from "~/lib/utils";

export interface CardProps {
  /** Main content of the card */
  children: JSX.Element;
  /** Optional header content (renders in CardHeader) */
  header?: JSX.Element;
  /** Optional title string (convenience prop, renders as CardTitle) */
  title?: string;
  /** Optional description text */
  description?: string;
  /** Optional actions (buttons, etc.) rendered in the header area */
  actions?: JSX.Element;
  /** Additional CSS classes for the card container */
  class?: string;
}

/**
 * Card - Application-level Card wrapper.
 * 
 * Composes solid-ui Card primitives into a consistent container
 * with optional header, title, description, and actions.
 * 
 * @example
 * // Simple card with title
 * <Card title="Locations">
 *   <LocationsTable locations={locations()} />
 * </Card>
 * 
 * @example
 * // Card with custom header and actions
 * <Card
 *   header={<div class="flex items-center gap-2"><Icon /><span>Locations</span></div>}
 *   actions={<Button onClick={openDialog}>Add Location</Button>}
 * >
 *   <LocationsTable locations={locations()} />
 * </Card>
 */
export const Card: Component<CardProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "header",
    "title",
    "description",
    "actions",
    "class",
  ]);

  const hasHeader = () => local.header || local.title || local.actions;

  return (
    <CardPrimitive class={cn("w-full", local.class)} {...rest}>
      <Show when={hasHeader()}>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
          <div class="space-y-1">
            <Show when={local.title}>
              <CardTitle>{local.title}</CardTitle>
            </Show>
            <Show when={local.header}>
              {local.header}
            </Show>
            <Show when={local.description}>
              <p class="text-sm text-gray-600">{local.description}</p>
            </Show>
          </div>
          <Show when={local.actions}>
            <div class="flex items-center gap-2">
              {local.actions}
            </div>
          </Show>
        </CardHeader>
      </Show>
      <CardContent class={hasHeader() ? undefined : "pt-6"}>
        {local.children}
      </CardContent>
    </CardPrimitive>
  );
};

export default Card;
