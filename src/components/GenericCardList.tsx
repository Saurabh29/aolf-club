import { Component, For, Show, JSX, createMemo, createSignal, onMount } from "solid-js"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/Card"
import { Button } from "~/components/ui/button"
import type { GenericCardListProps, CardAction, GridConfig } from "~/lib/schemas/ui/card.schema"

/**
 * GenericCardList - A reusable card list component
 * 
 * Displays items in a responsive grid layout with customizable rendering.
 * Used for Location lists and can be reused for any entity type.
 * 
 * @example
 * <GenericCardList
 *   items={locations()}
 *   title={(loc) => loc.name}
 *   description={(loc) => loc.locationCode}
 *   renderContent={(loc) => <p>{loc.address}</p>}
 *   actions={[
 *     { label: "Edit", onClick: (loc) => navigate(`/locations/${loc.id}/edit`) },
 *     { label: "Delete", onClick: (loc) => deleteLocation(loc.id), variant: "destructive" }
 *   ]}
 * />
 */

const DEFAULT_GRID: GridConfig = {
  sm: 1,
  md: 2,
  lg: 3,
}

function getGridClasses(grid: GridConfig): string {
  const classes = ["grid", "gap-4"]
  
  // Base (mobile) - always 1 column
  classes.push("grid-cols-1")
  
  // Responsive breakpoints
  if (grid.sm && grid.sm > 1) classes.push(`sm:grid-cols-${grid.sm}`)
  if (grid.md) classes.push(`md:grid-cols-${grid.md}`)
  if (grid.lg) classes.push(`lg:grid-cols-${grid.lg}`)
  if (grid.xl) classes.push(`xl:grid-cols-${grid.xl}`)
  
  return classes.join(" ")
}

export function GenericCardList<T extends { id: string }>(
  props: GenericCardListProps<T>
): JSX.Element {
  // Track client-side mount to avoid hydration mismatch for interactive elements
  const [isClient, setIsClient] = createSignal(false)
  onMount(() => setIsClient(true))

  const gridConfig = createMemo(() => props.grid ?? DEFAULT_GRID)
  
  // Pre-compute grid classes (Tailwind needs static classes for purging)
  const gridClasses = createMemo(() => {
    const g = gridConfig()
    // Use explicit classes for Tailwind JIT
    const cols = {
      1: "grid-cols-1",
      2: "grid-cols-2", 
      3: "grid-cols-3",
      4: "grid-cols-4",
    }
    const mdCols = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    }
    const lgCols = {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
    }
    
    return [
      "grid gap-4 grid-cols-1",
      g.md ? mdCols[g.md as keyof typeof mdCols] || "md:grid-cols-2" : "md:grid-cols-2",
      g.lg ? lgCols[g.lg as keyof typeof lgCols] || "lg:grid-cols-3" : "lg:grid-cols-3",
    ].join(" ")
  })

  return (
    <div class={props.containerClass}>
      {/* Empty state */}
      <Show when={props.items.length === 0}>
        <div class="flex flex-col items-center justify-center py-12 text-gray-500">
          <Show when={props.emptyIcon}>
            {props.emptyIcon}
          </Show>
          <p class="text-lg font-medium mt-4">
            {props.emptyMessage ?? "No items found"}
          </p>
          {/* Render emptyAction only on client to avoid hydration mismatch */}
          <Show when={isClient() && props.emptyAction}>
            <div class="mt-4">
              {props.emptyAction}
            </div>
          </Show>
        </div>
      </Show>

      {/* Card grid */}
      <Show when={props.items.length > 0}>
        <div class={gridClasses()}>
          <For each={props.items}>
            {(item, index) => (
              <Card class={props.cardClass}>
                <CardHeader>
                  <CardTitle>{props.title(item)}</CardTitle>
                  <Show when={props.description}>
                    <CardDescription>{props.description!(item)}</CardDescription>
                  </Show>
                </CardHeader>

                <Show when={props.renderContent}>
                  <CardContent>
                    {props.renderContent!(item)}
                  </CardContent>
                </Show>

                <Show when={props.actions && props.actions.length > 0}>
                  <CardFooter class="gap-2">
                    <For each={props.actions}>
                      {(action) => (
                        <Show when={!action.hidden || !action.hidden(item)}>
                          <Button
                            variant={action.variant ?? "outline"}
                            size="sm"
                            class={action.class}
                            onClick={() => action.onClick(item)}
                            disabled={action.disabled?.(item)}
                          >
                            <Show when={action.icon}>
                              <span class="mr-2">{action.icon}</span>
                            </Show>
                            {action.label}
                          </Button>
                        </Show>
                      )}
                    </For>
                  </CardFooter>
                </Show>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default GenericCardList
