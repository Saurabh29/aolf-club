/**
 * Home Page
 * 
 * Redirects authenticated users to Dashboard.
 * Shows welcome page for non-authenticated users.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";

export default function Home() {
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Check auth and redirect to dashboard if authenticated
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (resp.ok) {
        const data = await resp.json();
        if (data) {
          navigate("/dashboard", { replace: true });
          return;
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
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
          <p class="text-sm text-gray-600">Use the <strong>Sign In</strong> button at the top-right to sign in.</p>
        </div>
      </main>
    </Show>
  );
}
