import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { createSignal, onMount } from "solid-js";

export default function TestOAuth() {
  const [session, setSession] = createSignal<any>(null);

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
    <main class="p-8">
      <h1 class="text-2xl font-bold mb-4">Test GitHub OAuth</h1>

      <Show
        when={session()}
        fallback={
          <a
            rel="external"
            href="/api/auth/signin"
            class="rounded-full bg-blue-600 px-6 py-2 font-semibold text-white no-underline"
          >
            Sign in with GitHub
          </a>
        }
      >
        <div>
          <pre class="bg-gray-100 p-4 rounded">{JSON.stringify(session(), null, 2)}</pre>
          <a rel="external" href="/api/auth/signout" class="mt-4 inline-block">Sign out</a>
        </div>
      </Show>

      <div class="mt-6">
        <A href="/">Back home</A>
      </div>
    </main>
  );
}
