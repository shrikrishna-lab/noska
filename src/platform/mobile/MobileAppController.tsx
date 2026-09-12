// MobileAppController — the typed hand-off between App.tsx (which owns ALL
// workspace state and mutations, shared with web + desktop) and the mobile
// shell. The mobile UI is presentation-only: it never re-implements business
// logic, it calls these handlers.

import { createContext, useContext, type ReactNode } from "react";
import type { Page } from "../../lib/supabaseService";
import type { Tables } from "../../../types/supabase";
import type { SplitWorkspaceRendererProps } from "../../features/split/SplitWorkspaceRenderer";

export type PageInvite = Tables<"page_invites">;

export interface MobileAppController {
  /* ── data (mirrors WorkspaceContext/App state) ── */
  visiblePages: Page[];
  trashPages: Page[];
  sharedPages: Page[];
  pendingInvites: PageInvite[];
  activeId: string | null;
  activePage: Page | undefined;
  workspaceName: string;
  saveState: string;
  theme: string;
  dark: boolean;
  currentUserId: string | null;
  currentUsername: string | null;
  currentUserEmail: string | null;
  currentUserAvatar: string | null;
  ghostWriterEnabled: boolean;
  renameFocusId: string | null;
  appView: string;
  /** Stacked/secondary column pages on desktop; mobile renders only the active page. */
  stackedPageIds: string[];

  /* ── navigation ── */
  selectPage: (pageId: string) => void;
  selectView: (view: string) => void;

  /* ── page mutations ── */
  newPage: (template?: string, parentId?: string | null, options?: { title?: string }) => string | undefined;
  updatePage: (id: string, patch: Partial<Page>) => void;
  trashPage: (id: string) => void;
  restorePage: (id: string) => void;
  deleteForever: (id: string) => void;
  duplicatePage: (id: string) => void;
  toggleOffline: (id: string) => void;
  copyPageLink: (id: string) => void;
  renameFocus: (pageId: string) => void;
  removeRecent: (id: string) => void;
  unlockPage: (id: string, passphrase: string) => Promise<boolean>;
  patchBlockByPage: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  createSubpage: (parentId: string, afterBlockId: string, title?: string) => string | null | undefined;
  addInside: (parentId: string) => void;

  /* ── collaboration ── */
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;

  /* ── session & appearance ── */
  logout: () => void;
  setTheme: (theme: string) => void;
  /** Renames the workspace (optimistic + persisted). */
  updateWorkspaceName: (name: string) => void;

  /* ── misc ── */
  showToast: (msg: string) => void;
  /** Opens the full (desktop) Settings modal over the mobile shell. */
  openSettings: (tab?: string) => void;
  /** AI tool context built in App.tsx (pages + mutation actions). */
  toolContext: unknown;
  /** Editor wiring for the active page — spread onto SplitWorkspaceRenderer. */
  editorProps: SplitWorkspaceRendererProps;
  /** Username claim gate for pre-existing accounts. */
  needsUsernameClaim: boolean;
  claimUsername: (username: string) => void;
}

export const MobileControllerContext = createContext<MobileAppController | null>(null);

export function useMobileController(): MobileAppController {
  const ctx = useContext(MobileControllerContext);
  if (!ctx) {
    throw new Error("useMobileController must be used inside <MobileControllerContext.Provider>");
  }
  return ctx;
}
