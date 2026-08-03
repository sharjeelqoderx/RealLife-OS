/** Shared Policy Name…Action column widths so loading + live table match. */
export const policyTableClassName = "w-full table-fixed text-xs"

export const policyTableColgroup = (
  // widths as percentages — must stay in sync for skeleton + live UI
  [
    { key: "name", width: "34%" },
    { key: "type", width: "14%" },
    { key: "rules", width: "10%" },
    { key: "status", width: "14%" },
    { key: "updated", width: "18%" },
    { key: "action", width: "10%" },
  ] as const
)

export const policyTableCardClassName =
  "rounded-md bg-brand-surface ring-0 shadow-none"

export const policyTableHeadClassName =
  "h-8 border-b border-border/60 bg-muted/40 px-4 py-1.5 align-middle text-[11px] font-semibold tracking-wide text-brand-text-muted uppercase first:rounded-tl-xl last:rounded-tr-xl"

export const policyTableCellClassName = "px-4 py-2 align-middle text-xs"
