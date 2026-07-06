import React, { useMemo } from "react";
import DatabasePage from "../modules/database/DatabasePage";
import { makeEmptyDatabase } from "../utils/helpers";

export default function DatabaseBlock({ block, onPatch, isLocked, apiKey, aiProvider, page, onToast }) {
  const db = block.database || makeEmptyDatabase();

  const handlePatch = (patch) => {
    const nextDb = { ...db, ...patch };
    onPatch({ database: nextDb });
  };

  const handleOpenRow = (rowId) => {
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
    />
  );
}
