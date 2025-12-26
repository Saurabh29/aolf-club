/**
 * App Root
 * 
 * Global app shell with:
 * - Fixed header (AppHeader)
 * - Desktop sidebar navigation (DesktopNavigation)
 * - Mobile bottom navigation (MobileNavigation)
 * - Content area with proper spacing for fixed elements
 */

import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import AppHeader from "~/components/AppHeader";
import { DesktopNavigation, MobileNavigation } from "~/components/AppNavigation";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <>
          {/* Fixed header across all pages */}
          <AppHeader />

          {/* Desktop sidebar - hidden on mobile */}
          <DesktopNavigation />

          {/* Main content area with proper spacing */}
          {/* pt-16: top padding for fixed header (h-16) */}
          {/* lg:pl-64: left padding for desktop sidebar (w-64) on large screens */}
          {/* pb-16 lg:pb-0: bottom padding for mobile nav on small screens only */}
          <main class="pt-16 lg:pl-64 pb-16 lg:pb-0 min-h-screen bg-gray-50">
            <Suspense>{props.children}</Suspense>
          </main>

          {/* Mobile bottom navigation - hidden on desktop */}
          <MobileNavigation />
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
