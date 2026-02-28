// ─────────────────────────────────────────────────────────────────────────────
// components/common/ConfirmDialog.tsx — Generic confirmation dialog
//
// Wraps shadcn/ui Dialog to provide a confirm/cancel pattern used for
// destructive actions (e.g. deleting a bookmark or collection).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { LoadingSpinner } from './LoadingSpinner.js';

interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the user clicks Cancel or the close button. */
  onClose: () => void;
  /** Called when the user clicks the confirmation button. */
  onConfirm: () => void | Promise<void>;
  /** Dialog heading. */
  title: string;
  /** Explanatory body text. */
  description?: string;
  /** Label for the confirmation button. Default: "Confirm". */
  confirmLabel?: string;
  /** When true, the confirm button is styled as a destructive action. */
  destructive?: boolean;
  /** When true, a spinner replaces the button content and buttons are disabled. */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
}: ConfirmDialogProps): React.ReactElement {
  const handleConfirm = (): void => {
    void onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
