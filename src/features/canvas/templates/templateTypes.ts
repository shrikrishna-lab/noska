import { ConnectorType } from "../canvasStore";

export type TemplateCategory = "team" | "personal" | "marketplace" | "my_templates";

export type TeamScale = "small" | "medium" | "large";

export type TemplateVisibility = "private" | "workspace" | "public" | "unlisted";

export type PricingModel = "free" | "one_time" | "revenue_share";

export type ModerationStatus = "approved" | "pending_review" | "flagged" | "rejected";

export type WorkflowTriggerType = 
  | "card_moved_to_section"
  | "dependency_blocked"
  | "stale_timer"
  | "recurrence";

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: WorkflowTriggerType;
  condition?: {
    sectionId?: string;
    staleDays?: number;
    connectorType?: ConnectorType;
  };
  action: {
    type: "update_status" | "flag_warning" | "notify" | "add_timestamp" | "carry_forward";
    badgeText?: string;
    badgeColor?: string;
    roleHint?: string;
  };
}

export interface TemplateChecklistItem {
  id: string;
  label: string;
  completed?: boolean;
}

export interface TemplateSectionConfig {
  id: string;
  name: string;
  color: string;
  isOptional?: boolean;
  defaultEnabled?: boolean;
  description?: string;
  roleHint?: string; // e.g. "Facilitator / Lead", "Engineering Squad", "New Hire"
}

export interface TemplateStarterCard {
  sectionId: string;
  text: string;
  color?: string;
  scaleTier?: "all" | "medium_large" | "large_only";
  statusTag?: string;
}

export interface TemplateConnectorConfig {
  fromSection: string;
  fromCardIndex: number;
  toSection: string;
  toCardIndex: number;
  type: ConnectorType;
  label?: string;
}

export interface TemplateAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  bio?: string;
}

export interface TemplateReview {
  id: string;
  authorId: string;
  authorName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  verifiedUser: boolean; // Confirmed they actually used the template on a real board
}

export interface NoskaTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "team" | "personal" | "community";
  tags: string[];
  isOfficial?: boolean;
  isCommunity?: boolean;
  author?: TemplateAuthor;
  installCount?: number;
  rating?: number;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
  defaultNamePattern: string; // e.g. "Sprint Retro #{{number}} — {{project}}"
  isRecurring?: boolean;
  recurrenceCadence?: "weekly" | "biweekly" | "monthly";
  sections: TemplateSectionConfig[];
  starterCards: TemplateStarterCard[];
  defaultConnectors?: TemplateConnectorConfig[];
  scaleHints?: {
    small: { label: string; description: string; cardCount: number };
    medium: { label: string; description: string; cardCount: number };
    large: { label: string; description: string; cardCount: number };
  };
  // Part 4: Workflow & Automation Rules
  workflowRules?: WorkflowRule[];
  checklist?: TemplateChecklistItem[];
  roleHints?: Record<string, string>;
  // Part 5 & 6: Marketplace, Quality & Creator metadata
  version?: string;
  changelog?: string;
  visibility?: TemplateVisibility;
  curatedCollection?: "featured" | "remote_teams" | "solo_productivity" | "engineering_agile";
  isTrending?: boolean;
  moderationStatus?: ModerationStatus;
  reviews?: TemplateReview[];
  pricing_model?: PricingModel;
  price?: number;
  isFree?: boolean;
  priceUsd?: number;
}

export interface TemplateCustomizationOptions {
  boardName: string;
  enabledSections: string[];
  scale: TeamScale;
  saveToMyTemplates?: boolean;
  workspaceName?: string;
  projectName?: string;
}

export interface CreatorStats {
  totalInstalls: number;
  weeklyInstalls: number;
  averageRating: number;
  totalReviews: number;
  publishedCount: number;
  installHistory: Array<{ date: string; installs: number }>;
}
