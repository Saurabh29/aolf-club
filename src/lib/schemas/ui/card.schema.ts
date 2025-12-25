/**
 * Card Schema - Types for GenericCardList component
 * 
 * This file defines the schemas and types for the reusable GenericCardList component.
 * The GenericCardList can be used across multiple pages (locations, users, etc.)
 * by passing appropriate render functions and configuration.
 */

import type { JSX } from "solid-js";

/**
 * Grid configuration for responsive card layouts.
 * Uses Tailwind breakpoint column counts.
 */
export interface GridConfig {
  /** Columns at sm breakpoint (640px) */
  sm?: 1 | 2 | 3 | 4;
  /** Columns at md breakpoint (768px) */
  md?: 1 | 2 | 3 | 4;
  /** Columns at lg breakpoint (1024px) */
  lg?: 1 | 2 | 3 | 4;
  /** Columns at xl breakpoint (1280px) */
  xl?: 1 | 2 | 3 | 4;
}

/**
 * Button variants matching the Button component.
 */
export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

/**
 * Action button configuration for cards.
 */
export interface CardAction<T> {
  /** Display label for the button (can be string or JSX for icons) */
  label: string | JSX.Element;
  /** Click handler receiving the item */
  onClick: (item: T) => void;
  /** Button style variant */
  variant?: ButtonVariant;
  /** Additional CSS classes */
  class?: string;
  /** Icon element to display before label */
  icon?: JSX.Element;
  /** Condition to hide the action */
  hidden?: (item: T) => boolean;
  /** Condition to disable the action */
  disabled?: (item: T) => boolean;
}

/**
 * Props interface for GenericCardList component.
 * Generic type T represents the item type in the list.
 * Items must have an `id` property for keying.
 */
export interface GenericCardListProps<T extends { id: string }> {
  /** Array of items to display */
  items: T[];
  
  /** Function to render the card title */
  title: (item: T) => string | JSX.Element;
  
  /** Optional function to render the card description (subtitle) */
  description?: (item: T) => string | JSX.Element;
  
  /** Optional render function for card body content */
  renderContent?: (item: T) => JSX.Element;
  
  /** Optional array of action buttons to display in card footer */
  actions?: CardAction<T>[];
  
  /** Grid configuration for responsive layout */
  grid?: GridConfig;
  
  /** Additional CSS class for the container div */
  containerClass?: string;
  
  /** Additional CSS class for each card */
  cardClass?: string;
  
  /** Message to display when items array is empty */
  emptyMessage?: string;
  
  /** Icon element to display when empty */
  emptyIcon?: JSX.Element;
  
  /** Action element (e.g., button) to display when empty */
  emptyAction?: JSX.Element;
}

/**
 * Default grid configuration: 1 col mobile, 2 cols md, 3 cols lg.
 */
export const defaultGridConfig: GridConfig = {
  sm: 1,
  md: 2,
  lg: 3,
};
