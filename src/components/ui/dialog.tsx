/**
 * Dialog Components
 * 
 * Simple modal dialog using native HTML dialog element.
 * Light-mode only styling with Tailwind.
 * 
 * Usage:
 * <Dialog open={isOpen()} onOpenChange={setIsOpen}>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Add Location</DialogTitle>
 *       <DialogDescription>Fill in the details below.</DialogDescription>
 *     </DialogHeader>
 *     <div>Form content here</div>
 *     <DialogFooter>
 *       <Button>Save</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */

import { splitProps, type JSX, type Component, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "~/lib/utils";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: JSX.Element;
}

export const Dialog: Component<DialogProps> = (props) => {
  // Handle escape key to close dialog
  createEffect(() => {
    if (props.open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          props.onOpenChange?.(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = "hidden";
      
      onCleanup(() => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      });
    }
  });

  return (
    <Show when={props.open}>
      <Portal>
        {props.children}
      </Portal>
    </Show>
  );
};

export interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

export const DialogContent: Component<DialogContentProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children", "onClose"]);

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      local.onClose?.();
    }
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div class="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      {/* Content */}
      <div
        role="dialog"
        aria-modal="true"
        class={cn(
          "relative z-50 w-full max-w-lg mx-4",
          "rounded-lg border border-gray-200 bg-white p-6 shadow-lg",
          local.class
        )}
        {...rest}
      >
        {local.children}
        <button
          type="button"
          onClick={() => local.onClose?.()}
          class={cn(
            "absolute right-4 top-4 rounded-sm opacity-70 transition-opacity",
            "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          )}
          aria-label="Close"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export interface DialogHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader: Component<DialogHeaderProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col space-y-1.5 text-center sm:text-left", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
};

export const DialogTitle: Component<JSX.HTMLAttributes<HTMLHeadingElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <h2
      class={cn("text-lg font-semibold text-gray-900 leading-none tracking-tight", local.class)}
      {...rest}
    >
      {local.children}
    </h2>
  );
};

export const DialogDescription: Component<JSX.HTMLAttributes<HTMLParagraphElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <p
      class={cn("text-sm text-gray-600 mt-1", local.class)}
      {...rest}
    >
      {local.children}
    </p>
  );
};

export interface DialogFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const DialogFooter: Component<DialogFooterProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
};
