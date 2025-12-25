import { cn } from "~/lib/utils";
import type { JSX, ParentComponent } from "solid-js";
import { splitProps, createSignal, For, Show, onCleanup } from "solid-js";

/**
 * Toast/Notification component following solid-ui patterns
 * Light-mode only styling - no dark: variants
 */

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

// Global toast state
const [toasts, setToasts] = createSignal<Toast[]>([]);

export function toast(options: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const newToast: Toast = { id, ...options };
  
  setToasts((prev) => [...prev, newToast]);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 5000);

  return id;
}

export function dismissToast(id: string) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export const Toaster: ParentComponent = () => {
  return (
    <div class="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      <For each={toasts()}>
        {(toastItem) => (
          <div
            class={cn(
              "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all mb-2",
              toastItem.variant === "destructive"
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-200 bg-white text-gray-900"
            )}
          >
            <div class="grid gap-1">
              <Show when={toastItem.title}>
                <div class="text-sm font-semibold">{toastItem.title}</div>
              </Show>
              <Show when={toastItem.description}>
                <div class="text-sm opacity-90">{toastItem.description}</div>
              </Show>
            </div>
            <button
              class="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2"
              onClick={() => dismissToast(toastItem.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
      </For>
    </div>
  );
};
