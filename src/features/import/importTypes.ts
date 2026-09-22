import type { Block } from "../../../types/blocks";

/** A single page parsed out of an import source, ready to become a Noska page. */
export interface ImportedPageDraft {
  title: string;
  icon?: string;
  blocks: Block[];
  /** Original file name inside the import (zip entry, file name, note title...). */
  sourceFile?: string;
  tags?: string[];
}

export type ImportDestination = "smart" | "append" | "new";

export type ImportSourceKind =
  | "markdown"
  | "txt"
  | "html"
  | "csv"
  | "json"
  | "enex"
  | "notion-zip"
  | "paste";

export interface ParsedImport {
  pages: ImportedPageDraft[];
  warnings: string[];
}
