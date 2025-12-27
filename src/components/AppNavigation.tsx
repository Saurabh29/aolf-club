/**
 * AppNavigation Component
 * 
 * Provides responsive navigation:
 * - Mobile: Fixed bottom navigation bar (icons + labels)
 * - Desktop: Fixed left sidebar navigation
 * 
 * Navigation items: Dashboard, Location, Serve Hub, User Management
 * 
 * Uses solid-ui components only.
 * Mobile-first design with touch-friendly spacing.
 */

import { A, useLocation } from "@solidjs/router";
import { For } from "solid-js";
import type { NavigationItem } from "~/lib/schemas/ui";

// Navigation configuration
const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Locations",
    href: "/locations",
    icon: (
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: (
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    label: "Serve Hub",
    href: "/serve-hub",
    icon: (
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/users",
    icon: (
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
];

/**
 * Mobile Bottom Navigation
 * Fixed at bottom, shown only on mobile screens
 */
export function MobileNavigation() {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div class="flex justify-around items-center h-16 px-2">
        <For each={navigationItems}>
          {(item) => (
            <A
              href={item.href}
              class={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                isActive(item.href)
                  ? "text-sky-600"
                  : "text-gray-600 hover:text-sky-600"
              }`}
            >
              <div class="w-6 h-6">{item.icon}</div>
              <span class="text-xs mt-1 font-medium">{item.label}</span>
            </A>
          )}
        </For>
      </div>
    </nav>
  );
}

/**
 * Desktop Sidebar Navigation
 * Fixed on left side, shown only on desktop screens
 */
export function DesktopNavigation() {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside class="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav class="p-4 space-y-2">
        <For each={navigationItems}>
          {(item) => (
            <A
              href={item.href}
              class={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-sky-100 text-sky-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div class="w-6 h-6">{item.icon}</div>
              <span>{item.label}</span>
            </A>
          )}
        </For>
      </nav>
    </aside>
  );
}
