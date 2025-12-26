/**
 * Dashboard Page
 * 
 * Displays task reports and summaries.
 * Phase 2A: Empty shell with auth check.
 * Phase 2B: Will implement task summary cards.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Simple auth check - only verify if user is authenticated
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (!resp.ok) {
        setIsAuthenticated(false);
        navigate("/test-oauth", { replace: true });
        return;
      }
      const data = await resp.json();
      setIsAuthenticated(!!data);
      if (!data) {
        navigate("/test-oauth", { replace: true });
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      setIsAuthenticated(false);
      navigate("/test-oauth", { replace: true });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading() && isAuthenticated()}>
      <div class="container mx-auto p-4 md:p-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Phase 2B: Task summary cards will be implemented here */}
        <div class="text-gray-600">
          <p>Task reports and summaries will appear here.</p>
        </div>
      </div>
    </Show>
  );
}
