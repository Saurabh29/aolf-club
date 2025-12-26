/**
 * AppHeader Component
 * 
 * Fixed header for all pages.
 * - Top-left: Art of Living logo
 * - Top-right: OAuth authentication dropdown
 * 
 * Reuses OAuth logic from test-oauth.tsx without modification.
 * Uses solid-ui components only.
 */

import { Show, createSignal, onMount } from "solid-js";
import { Button } from "~/components/ui/button";
import type { AuthSession } from "~/lib/schemas/ui";

export default function AppHeader() {
  const [session, setSession] = createSignal<AuthSession | null>(null);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);

  // Reuse OAuth session fetch logic from test-oauth.tsx
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (!resp.ok) {
        setSession(null);
        return;
      }
      const data = await resp.json();
      setSession(data ?? null);
    } catch (e) {
      console.error("Failed to fetch session:", e);
      setSession(null);
    }
  });

  return (
    <header class="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div class="h-full px-4 flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Top-left: Art of Living logo */}
        <div class="flex items-center">
          <img
            src="https://s3-eu-west-1.amazonaws.com/tpd/logos/5e560d9e2cd156000127ee16/0x0.png"
            alt="Art of Living"
            class="h-10 w-auto"
          />
        </div>

        {/* Top-right: Authentication */}
        <div class="flex items-center">
          <Show
            when={session()}
            fallback={
              <div class="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDropdownOpen(!dropdownOpen())}
                >
                  Sign In
                </Button>
                {/* OAuth Provider Dropdown */}
                <Show when={dropdownOpen()}>
                  <div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                    <a
                      href="/api/auth/signin/google"
                      rel="external"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Sign in with Google
                    </a>
                    <a
                      href="/api/auth/signin/github"
                      rel="external"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Sign in with GitHub
                    </a>
                  </div>
                </Show>
              </div>
            }
          >
            <div class="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDropdownOpen(!dropdownOpen())}
                class="flex items-center gap-2"
              >
                {/* User avatar if available */}
                <Show when={session()?.user?.image}>
                  <img
                    src={session()!.user!.image!}
                    alt="User avatar"
                    class="h-6 w-6 rounded-full"
                  />
                </Show>
                <span class="hidden sm:inline">
                  {session()?.user?.name || session()?.user?.email || "User"}
                </span>
                {/* Dropdown chevron icon */}
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>

              {/* User Dropdown */}
              <Show when={dropdownOpen()}>
                <div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                  <a
                    href="/api/auth/signout"
                    rel="external"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Sign Out
                  </a>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
