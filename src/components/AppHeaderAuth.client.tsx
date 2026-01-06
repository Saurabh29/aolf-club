import { Show, createSignal } from "solid-js";
import { createAsync } from "@solidjs/router";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { User as UserIcon } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from "~/components/ui/dropdown-menu";
import { getAuthSession } from "~/lib/auth";
import { getUserLocationsQuery } from "~/server/api/locations";
import { A } from "@solidjs/router";

export default function AppHeaderAuthClient() {
  const session = createAsync(() => getAuthSession());
  // Local state for dropdown and locations
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [userLocations, setUserLocations] = createSignal<Array<{ id: string; name: string }>>([]);
  const [activeLocationId, setActiveLocationId] = createSignal<string | null>(null);

  const getInitials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return "";
    const parts = nameOrEmail.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div class="flex items-center">
      <Show when={session()} fallback={
        <DropdownMenu>
          <DropdownMenuTrigger as={Button<"button">} variant="outline" size="sm" class="p-2">
            <Avatar class="h-5 w-5">
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
              const payload = await getUserLocationsQuery();
              // payload should be the resolved data shape from the query
              setUserLocations(payload.locations || []);
              const fromSession = (session() as any)?.user?.activeLocationId as string | undefined;
              const active = payload.activeLocationId ?? fromSession ?? localStorage.getItem("activeLocationId");
              if (active) {
                try { localStorage.setItem("activeLocationId", active); } catch (e) {}
                setActiveLocationId(active);
              }
            } catch (e) {
              console.error("Failed to fetch user locations:", e);
              setUserLocations([]);
            }
          }
        }}>
          <DropdownMenuTrigger as={Button<"button">} variant="ghost" size="sm" class={`flex items-center gap-2 ${dropdownOpen() ? "ring-2 ring-blue-200" : ""}`}>
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
                    <div class={`px-4 py-2 text-sm text-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${activeLocationId() === loc.id ? 'bg-gray-100 font-medium' : ''}`}>
                      <span>{loc.name}</span>
                    </div>
                  ))}
                </Show>
              </div>
            </DropdownMenuContent>
        </DropdownMenu>
      </Show>
    </div>
  );
}
