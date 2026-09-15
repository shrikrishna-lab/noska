import type { Page } from "../../../lib/supabaseService";
import type { Block } from "../../../../types/blocks";

export type PreviewType =
  | "simple"
  | "rich"
  | "document"
  | "task"
  | "database"
  | "folder"
  | "heading"
  | "code"
  | "callout"
  | "ai"
  | "system";

export type PageEntityType =
  | "page"
  | "document"
  | "project"
  | "task"
  | "database"
  | "folder"
  | "heading"
  | "code"
  | "callout"
  | "ai"
  | "section"
  | "system";

export interface NavigationChildItem {
  id: string;
  title: string;
  type: PageEntityType;
  icon?: string;
  status?: string;
  route?: string;
  blockId?: string;
}

export interface NavigationTreeItem {
  id: string;
  title: string;
  parentId: string | null;
  parentTitle?: string;
  type: PageEntityType;
  icon?: string;
  route?: string;
  depth: number;
  isSystem?: boolean;
  isContentSection?: boolean;
  isParentPage?: boolean;
  blockId?: string;
  commandTag?: string;
  snippet?: string;
  children: NavigationTreeItem[];
  rawPage?: Page;
  rawBlock?: Block;
}

export interface PagePreviewMetadata {
  status?: string;
  owner?: string;
  date?: string;
  progress?: number;
  priority?: string;
  lastUpdated?: string;
  tags?: string[];
  category?: string;
  lang?: string;
  level?: number;
}

export interface PagePreviewStats {
  childCount?: number;
  blockCount?: number;
  taskCount?: number;
  completedTaskCount?: number;
  entryCount?: number;
  wordCount?: number;
  charCount?: number;
  lineCount?: number;
}

export interface PagePreviewModel {
  pageId: string;
  title: string;
  type: PageEntityType;
  previewType: PreviewType;
  icon?: string;
  commandTag?: string;
  description?: string;
  firstMeaningfulContent?: string;
  snippet?: string;
  contentLines?: string[];
  metadata?: PagePreviewMetadata;
  highlights?: string[];
  children?: NavigationChildItem[];
  stats?: PagePreviewStats;
  updatedAt?: string;
  fallbackLevel: 1 | 2 | 3 | 4 | 5;
  isContentSection?: boolean;
  isParentPage?: boolean;
  parentPageId?: string;
  parentPageTitle?: string;
  parentPageIcon?: string;
  blockId?: string;
}

export interface LineNavigationRailProps {
  pages: Page[];
  activeId: string | null;
  appView?: string;
  currentRoute?: string;
  onSelectPage: (pageId: string) => void;
  onSelectView?: (view: string) => void;
  className?: string;
  collapsed?: boolean;
  showInSidebar?: boolean;
  position?: "left" | "right";
  sidebarOpen?: boolean;
  offsetX?: number | string;
}
