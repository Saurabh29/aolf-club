/**
 * Protected Routes Layout
 * 
 * This layout wraps all routes in the (protected) folder.
 * It ensures users are authenticated before accessing any protected page.
 * If not authenticated, users are redirected to the home page.
 * 
 * This centralizes authentication checks instead of duplicating in every route.
 */

import { createAsync, type RouteSectionProps } from "@solidjs/router";
import { Show } from "solid-js";
import { getUser } from "~/lib/auth";

export default function ProtectedLayout(props: RouteSectionProps) {
  // Single auth check for all protected routes
  const user = createAsync(() => getUser(), { deferStream: true });

  return (
    <Show when={user()} fallback={<div class="flex items-center justify-center min-h-screen">Loading...</div>}>
      {props.children}
    </Show>
  );
}
