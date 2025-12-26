/**
 * Navigation UI Schemas
 * 
 * Type definitions for navigation structure (mobile & desktop).
 * Used by Nav component for consistent navigation rendering.
 */

import type { JSX } from "solid-js";

/**
 * NavigationItem - Single navigation menu item
 */
export interface NavigationItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Icon element (solid-ui icon component) */
  icon?: JSX.Element;
  /** Badge count (e.g., unread count) */
  badge?: number;
  /** Active route matcher (optional, defaults to exact href match) */
  activeMatch?: RegExp;
}

/**
 * NavigationConfig - Complete navigation configuration
 * Supports different layouts for mobile vs desktop
 */
export interface NavigationConfig {
  /** Items shown in mobile bottom nav and desktop sidebar */
  items: NavigationItem[];
  /** User profile section */
  userSection?: {
    displayName: string;
    email?: string;
    avatarUrl?: string;
  };
}
