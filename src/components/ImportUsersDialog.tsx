import { createSignal, Show, type Component } from "solid-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { importUsersFromCSVAction } from "~/server/api/users";

export interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsersImported?: () => void;
}

export const ImportUsersDialog: Component<ImportUsersDialogProps> = (props) => {
  const [csvContent, setCsvContent] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<{ imported: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
        setError(null);
        setResult(null);
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!csvContent()) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const importResult = await importUsersFromCSVAction({
        csvData: csvContent(),
      });

      if (importResult.success) {
        setResult(importResult.data);
        
        // If all imports succeeded, close dialog after brief delay
        if (importResult.data.failed === 0) {
          setTimeout(() => {
            props.onOpenChange(false);
            props.onUsersImported?.();
            setCsvContent("");
            setResult(null);
          }, 2000);
        }
      } else {
        setError(importResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import users");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    props.onOpenChange(false);
    setCsvContent("");
    setError(null);
    setResult(null);
  };

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Users from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with user information. Supported columns: name, email, phone (with fuzzy matching).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <Label for="csvFile">CSV File</Label>
            <input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <p class="text-xs text-gray-500">
              Expected columns: name/full_name, email/mail, phone/mobile/contact
            </p>
          </div>

          <Show when={csvContent()}>
            <div class="text-sm text-gray-600">
              File loaded: {csvContent().split('\n').length - 1} rows (excluding header)
            </div>
          </Show>

          <Show when={result()}>
            {(r) => (
              <div class="rounded-lg border p-4 space-y-2">
                <div class="font-medium text-green-600">
                  ✓ Successfully imported {r().imported} user(s)
                </div>
                <Show when={r().failed > 0}>
                  <div class="font-medium text-red-600">
                    ✗ Failed to import {r().failed} user(s)
                  </div>
                  <Show when={r().errors.length > 0}>
                    <div class="text-sm text-gray-600 max-h-32 overflow-y-auto">
                      <div class="font-medium mb-1">Errors:</div>
                      <ul class="list-disc list-inside space-y-1">
                        {r().errors.slice(0, 5).map(err => (
                          <li>{err}</li>
                        ))}
                        {r().errors.length > 5 && (
                          <li class="text-gray-500">
                            ... and {r().errors.length - 5} more error(s)
                          </li>
                        )}
                      </ul>
                    </div>
                  </Show>
                </Show>
              </div>
            )}
          </Show>

          <Show when={error()}>
            <div class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error()}
            </div>
          </Show>

          <div class="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading()}
            >
              {result() && result()!.imported > 0 ? "Done" : "Cancel"}
            </Button>
            <Show when={!result() || result()!.failed > 0}>
              <Button type="submit" disabled={loading() || !csvContent()}>
                {loading() ? "Importing..." : "Import Users"}
              </Button>
            </Show>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
