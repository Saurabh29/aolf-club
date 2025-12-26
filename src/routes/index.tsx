/**
 * Home Page
 * 
 * Redirects authenticated users to Dashboard.
 * Shows welcome page for non-authenticated users.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Check auth and redirect to dashboard if authenticated
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (resp.ok) {
        const data = await resp.json();
        if (data) {
          setIsAuthenticated(true);
          navigate("/dashboard", { replace: true });
          return;
        }
      }
      setIsAuthenticated(false);
    } catch (e) {
      console.error("Auth check failed:", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading()}>
      <main class="text-center mx-auto text-gray-700 p-4">
        <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
          Art of Living
        </h1>
        <p class="text-xl mb-8">Welcome to the AOLF Club Management System</p>
        <div class="flex flex-col gap-4 items-center">
          <a
            href="/api/auth/signin"
            rel="external"
            class="inline-block rounded-lg bg-sky-600 px-8 py-3 font-semibold text-white hover:bg-sky-700 transition-colors"
          >
            Sign In to Continue
          </a>
        </div>
      </main>
    </Show>
  );
}
