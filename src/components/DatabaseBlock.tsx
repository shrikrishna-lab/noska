import React, { useMemo } from "react";
import DatabasePage from "../modules/database/DatabasePage";
import { makeEmptyDatabase } from "../utils/helpers";
// Aliased to avoid colliding with this file's own `DatabaseBlock` component
// name (same pattern as CodeBlockData vs. the CodeBlock component,
// ColumnsBlockData vs. the ColumnsBlock component).
import type { DatabaseBlock as DatabaseBlockData, DatabaseSchema } from "../../types/blocks";
import type { Page } from "../lib/supabaseService";

interface DatabaseBlockProps {
  block: DatabaseBlockData;
  onPatch: (patch: Partial<DatabaseBlockData>) => void;
  isLocked?: boolean;
  apiKey?: string;
  aiProvider?: string;
  page?: Page;
  onToast?: (message: string) => void;
}

export default function DatabaseBlock({ block, onPatch, isLocked, apiKey, aiProvider, page, onToast }: DatabaseBlockProps) {
  // makeEmptyDatabase is re-exported from src/utils/blockModel.js (still
  // untyped .js, Tier 2 scope) — cast its return through DatabaseSchema
  // since this call site is the sole real consumer of that shape here.
  const db: DatabaseSchema = block.database || (makeEmptyDatabase() as DatabaseSchema);

  const handlePatch = (patch: Partial<DatabaseSchema>) => {
    const nextDb = { ...db, ...patch };
    onPatch({ database: nextDb });
  };

  const handleOpenRow = (rowId: string) => {
    const row = db.rows.find(r => r.id === rowId);
    if (row) {
      onPatch({ text: row.name || "Untitled" });
    }
  };

  return (
    <DatabasePage
      database={db}
      onPatch={handlePatch}
      onOpenRow={handleOpenRow}
      pageId={block.id}
      apiKey={apiKey}
      aiProvider={aiProvider}
      onToast={onToast}
      title={block.text}
      // icon: DatabasePage.jsx (untouched, still .jsx) destructures this
      // with no default, so its inferred prop type requires it. This call
      // site never previously passed it either — documentation only, not
      // a behavior change (same dead-prop pattern as earlier batches).
      icon={undefined}
    />
  );
}
