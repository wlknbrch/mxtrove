import { useEffect, useState } from "react";
import { ShieldAlert, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type {
  AdminRemovableContentType,
  AdminRemovalReason,
} from "@/features/admin/api";

const removalReasons: Array<{ value: AdminRemovalReason; label: string }> = [
  { value: "copyright", label: "Copyright infringement" },
  { value: "hate", label: "Hateful content" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "illegal_content", label: "Illegal content" },
  { value: "spam", label: "Spam or manipulation" },
  { value: "other", label: "Other policy violation" },
];

export interface AdminRemovalTarget {
  type: AdminRemovableContentType;
  id: string;
  label: string;
}

export function ContentRemovalDialog({
  target,
  pending,
  onClose,
  onConfirm,
}: {
  target: AdminRemovalTarget | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: AdminRemovalReason) => void;
}) {
  const [reason, setReason] = useState<AdminRemovalReason | "">("");

  useEffect(() => {
    if (!target) return undefined;
    setReason("");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending, target]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-background/75 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-removal-title"
        className="w-full max-w-xl rounded-[30px] border border-danger/25 bg-surface-strong p-5 shadow-[0_34px_100px_rgba(0,0,0,0.58)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-[18px] border border-danger/25 bg-danger/10 text-danger">
              <ShieldAlert className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-danger">Moderation action</p>
              <h2 id="admin-removal-title" className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em]">
                Remove {target.type === "post" ? "release" : "comment"} from MxTrove?
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="sm" aria-label="Close removal dialog" onClick={onClose} disabled={pending}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-6 rounded-[22px] border border-border bg-white/[0.025] p-4">
          <p className="line-clamp-3 text-sm font-medium leading-6">{target.label}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This removes the public listing and access through MxTrove. Files in the creator's connected cloud account are not deleted.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium">Reason for removal</span>
          <Select
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value as AdminRemovalReason | "")}
            autoFocus
          >
            <option value="">Choose a reason</option>
            {removalReasons.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </label>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          The action, moderator, reason, timestamp, and a content snapshot are recorded in the moderation audit log. Matching open reports are marked as action taken, and the affected creator receives a system notification with the reason and location.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (reason) onConfirm(reason);
            }}
            disabled={!reason || pending}
          >
            <Trash2 className="size-4" />
            {pending ? "Removing…" : "Remove from MxTrove"}
          </Button>
        </div>
      </section>
    </div>
  );
}
