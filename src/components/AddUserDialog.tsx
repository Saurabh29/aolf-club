import { createSignal, Show, type Component } from "solid-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createUserManual } from "~/server/api/users";

export interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export const AddUserDialog: Component<AddUserDialogProps> = (props) => {
  const [displayName, setDisplayName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [userType, setUserType] = createSignal<"MEMBER" | "LEAD">("MEMBER");
  const [isAdmin, setIsAdmin] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createUserManual({
        displayName: displayName(),
        email: email() || undefined,
        phone: phone() || undefined,
        userType: userType(),
        isAdmin: isAdmin(),
      });

      if (result.success) {
        // Reset form
        setDisplayName("");
        setEmail("");
        setPhone("");
        setUserType("MEMBER");
        setIsAdmin(false);
        
        // Close dialog
        props.onOpenChange(false);
        
        // Notify parent
        props.onUserCreated?.();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user and associate them with your active location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <Label for="displayName">Name *</Label>
            <Input
              id="displayName"
              value={displayName()}
              onInput={(e) => setDisplayName(e.currentTarget.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="john.doe@example.com"
            />
          </div>

          <div class="space-y-2">
            <Label for="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone()}
              onInput={(e) => setPhone(e.currentTarget.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div class="space-y-2">
            <Label for="userType">User Type</Label>
            <select
              id="userType"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={userType()}
              onChange={(e) => setUserType(e.currentTarget.value as "MEMBER" | "LEAD")}
            >
              <option value="MEMBER">Member</option>
              <option value="LEAD">Lead</option>
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <Input
              id="isAdmin"
              type="checkbox"
              checked={isAdmin()}
              onChange={(e) => setIsAdmin(e.currentTarget.checked)}
              class="h-4 w-4 rounded border-gray-300"
            />
            <Label for="isAdmin" class="font-normal cursor-pointer">
              Administrator (full access)
            </Label>
          </div>

          <Show when={error()}>
            <div class="text-sm text-red-600">{error()}</div>
          </Show>

          <div class="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={loading()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading()}>
              {loading() ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
