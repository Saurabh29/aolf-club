import { cn } from "~/lib/utils";
import type { JSX, Component, ParentComponent } from "solid-js";
import { splitProps, createSignal, createContext, useContext, Show } from "solid-js";

/**
 * Dialog component following solid-ui patterns
 * Light-mode only styling - no dark: variants
 * 
 * Usage:
 * <Dialog open={open()} onOpenChange={setOpen}>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *       <DialogDescription>Description</DialogDescription>
 *     </DialogHeader>
 *     ... content ...
 *     <DialogFooter>
 *       <Button>Submit</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */

interface DialogContextValue {
  open: () => boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>();

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog");
  }
  return context;
}

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: JSX.Element;
}

export const Dialog: Component<DialogProps> = (props) => {
  const [internalOpen, setInternalOpen] = createSignal(false);

  const open = () => props.open ?? internalOpen();
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    props.onOpenChange?.(value);
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {props.children}
    </DialogContext.Provider>
  );
};

export interface DialogTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DialogTrigger: ParentComponent<DialogTriggerProps> = (props) => {
  const [local, others] = splitProps(props, ["children", "onClick"]);
  const { setOpen } = useDialog();

  return (
    <button
      {...others}
      onClick={(e) => {
        setOpen(true);
        if (typeof local.onClick === "function") {
          local.onClick(e);
        }
      }}
    >
      {local.children}
    </button>
  );
};

export interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const DialogContent: ParentComponent<DialogContentProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  const { open, setOpen } = useDialog();

  return (
    <Show when={open()}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 bg-black/80"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div
        class={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
          "gap-4 border border-gray-200 bg-white p-6 shadow-lg sm:rounded-lg",
          local.class
        )}
        {...others}
      >
        {local.children}
        {/* Close button */}
        <button
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
          onClick={() => setOpen(false)}
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </Show>
  );
};

export interface DialogHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader: ParentComponent<DialogHeaderProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col space-y-1.5 text-center sm:text-left", local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
};

export interface DialogFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const DialogFooter: ParentComponent<DialogFooterProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
};

export interface DialogTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle: ParentComponent<DialogTitleProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <h2
      class={cn("text-lg font-semibold leading-none tracking-tight text-gray-900", local.class)}
      {...others}
    >
      {local.children}
    </h2>
  );
};

export interface DialogDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription: ParentComponent<DialogDescriptionProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <p
      class={cn("text-sm text-gray-500", local.class)}
      {...others}
    >
      {local.children}
    </p>
  );
};
