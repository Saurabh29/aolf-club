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

import { Show, createSignal } from "solid-js";
import { A, createAsync } from "@solidjs/router";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { User as UserIcon } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from "~/components/ui/dropdown-menu";
import { getAuthSession } from "~/lib/auth";
import { getUserLocations, setActiveLocation } from "~/server/actions/locations";

export default function AppHeader() {
  // Use unified getAuthSession - works as both query and direct call
  // deferStream: true prevents hydration mismatch by streaming auth UI after initial HTML
  const session = createAsync(() => getAuthSession(), { deferStream: true });
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [userLocations, setUserLocations] = createSignal<Array<{ id: string; name: string }>>([]);
  const [activeLocationId, setActiveLocationId] = createSignal<string | null>(null);

  // dropdown primitive handles outside-click and Escape; no manual listeners

  const getInitials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return "";
    const parts = nameOrEmail.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
          <Show when={session()} fallback={
            <DropdownMenu>
                <DropdownMenuTrigger as={Button<"button">} variant="outline" size="sm" class="p-2">
                <Avatar class="h-5 w-5">
                  <Show when={!session()}>
                    <UserIcon class="h-4 w-4 text-gray-600" />
                  </Show>
                  <AvatarFallback>
                    <UserIcon class="h-4 w-4 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
                <span class="ml-2 hidden sm:inline">Sign in</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-48">
                <div class="px-3 py-2 text-xs text-gray-500">Sign in with</div>
                  <DropdownMenuGroup>
                  <DropdownMenuItem as="a" href="/api/auth/signin?provider=google" rel="external" class="flex items-center gap-2">
                      <img src="/assets/icons/google.svg" alt="Google" class="h-5 w-5" />
                      <span>Sign in with Google</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem as="a" href="/api/auth/signin?provider=github" rel="external" class="flex items-center gap-2">
                      <img src="/assets/icons/github.svg" alt="GitHub" class="h-5 w-5" />
                      <span>Sign in with GitHub</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          }>
            <DropdownMenu onOpenChange={async (open) => {
              setDropdownOpen(open);
              if (open && session()) {
                try {
                  const resp = await getUserLocations();
                  if (resp.success) {
                    const payload: any = resp.data as any;
                    setUserLocations(payload.locations || []);
                    const fromSession = (session() as any)?.user?.activeLocationId as string | undefined;
                    const active = payload.activeLocationId ?? fromSession ?? localStorage.getItem("activeLocationId");
                    if (active) {
                      try { localStorage.setItem("activeLocationId", active); } catch (e) {}
                      setActiveLocationId(active);
                    }
                  }
                } catch (e) {
                  console.error("Failed to fetch user locations:", e);
                  setUserLocations([]);
                }
              }
            }}>
              <DropdownMenuTrigger as={Button<"button">} variant="ghost" size="sm" class="flex items-center gap-2">
                <Avatar class="h-6 w-6">
                  <Show when={session()?.user?.image}>
                    <AvatarImage src={session()!.user!.image!} alt="User avatar" class="h-full w-full object-cover" />
                  </Show>
                  <AvatarFallback>{getInitials(session()?.user?.name ?? session()?.user?.email ?? null)}</AvatarFallback>
                </Avatar>
                <span class="hidden sm:inline">{session()?.user?.name || session()?.user?.email || "User"}</span>
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem as="a" href="/api/auth/signout" rel="external">Sign Out</DropdownMenuItem>
                <div class="px-3 py-2 text-xs text-gray-500">Locations</div>
                <div class="divide-y divide-gray-100 max-h-48 overflow-auto">
                  <Show when={userLocations().length > 0} fallback={<div class="px-4 py-2 text-sm text-gray-600">No locations. <A href="/locations?create=1" class="text-blue-600">Create one</A></div>}>
                    {userLocations().map((loc) => (
                      <LocationItem loc={loc} activeId={activeLocationId} setActiveId={setActiveLocationId} isAuthenticated={() => !!session()} closeMenu={setDropdownOpen} />
                    ))}
                  </Show>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
        </div>
      </div>
    </header>
  );
}

// Location item component for dropdown with active selection
function LocationItem(props: { loc: { id: string; name: string }; activeId: () => string | null; setActiveId: (v: string | null) => void; isAuthenticated: () => boolean; closeMenu?: (v: boolean) => void }) {
  const isActive = () => props.activeId() === props.loc.id;

  const select = async () => {
    try {
      // If user is authenticated, persist to DB via server action
      if (!props.isAuthenticated()) {
        console.warn("Must sign in to set active location");
        return;
      }

      try {
        await setActiveLocation(props.loc.id);
      } catch (e) {
        console.error('Failed to persist active location', e);
        return;
      }
    } catch (e) {
      console.error('Failed to set server active location cookie', e);
    }

    try {
      localStorage.setItem("activeLocationId", props.loc.id);
      props.setActiveId(props.loc.id);
      // Close the dropdown menu if provided
      try { props.closeMenu?.(false); } catch (e) {}
      // Optionally trigger a page refresh or event dispatch here
    } catch (e) {
      console.error("Failed to set active location", e);
    }
  };

  return (
    <div
      class={`px-4 py-2 text-sm text-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${isActive() ? "bg-gray-100 font-medium" : ""}`}
      onClick={select}
    >
      <span>{props.loc.name}</span>
      <Show when={isActive()}>
        <svg class="w-4 h-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clip-rule="evenodd" />
        </svg>
      </Show>
    </div>
  );
}
