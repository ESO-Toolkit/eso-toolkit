// Discord Interaction Types
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
} as const;

export const MessageFlags = {
  EPHEMERAL: 64,
} as const;

export const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
} as const;

export const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
} as const;

export const TextInputStyle = {
  SHORT: 1,
  PARAGRAPH: 2,
} as const;

export const ChannelType = {
  GUILD_TEXT: 0,
} as const;

// Env interface for Cloudflare Worker
export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GITHUB_TOKEN: string;
  ZAI_API_KEY: string;
  TICKETS: KVNamespace;
  ROSTERS: KVNamespace;
  // Config constants (set in wrangler.toml vars)
  GUILD_ID: string;
  TICKET_CATEGORY_ID: string;
  TICKET_LOGS_CHANNEL_ID: string;
  PANEL_CHANNEL_ID: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  ROSTER_HUB_API_URL: string;
  WEBHOOK_SECRET?: string | undefined;
  ENVIRONMENT?: string | undefined;
}

// Discord Interaction payloads
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordMember {
  user?: DiscordUser;
  roles: string[];
  permissions?: string;
}

export interface DiscordInteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteractionData {
  id?: string;
  name?: string;
  type?: number;
  options?: DiscordInteractionOption[];
  custom_id?: string;
  component_type?: number;
  values?: string[];
  components?: DiscordModalComponent[][];
  resolved?: {
    users?: Record<string, DiscordUser>;
    members?: Record<string, DiscordMember>;
  };
}

export interface DiscordModalComponent {
  type: number;
  custom_id?: string;
  value?: string;
  components?: DiscordModalComponent[];
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  message?: DiscordMessage;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  author?: { name: string; icon_url?: string };
  thumbnail?: { url: string };
}

export interface DiscordComponent {
  type: number;
  components?: DiscordComponent[];
  style?: number;
  label?: string;
  emoji?: { name: string };
  custom_id?: string;
  disabled?: boolean;
  url?: string;
  placeholder?: string;
  min_length?: number;
  max_length?: number;
  required?: boolean;
  value?: string;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author?: DiscordUser;
  content: string;
  timestamp: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  guild_id?: string;
  parent_id?: string;
  position?: number;
}

export interface InteractionResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: DiscordEmbed[];
    components?: DiscordComponent[];
    flags?: number;
    title?: string;
    custom_id?: string;
  };
}

// Ticket state stored in KV
export type TicketCategory = 'Bug' | 'Feature' | 'Feedback';
export type TicketStatus = 'open' | 'claimed' | 'closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TicketState {
  id: string; // padded: "0001"
  channelId: string;
  userId: string;
  username: string;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  claimedBy?: string;
  claimedByUsername?: string;
  claimedAt?: string; // ISO timestamp for inactivity tracking
  closedAt?: string; // ISO timestamp for potential reopen
  closedBy?: string;
  closedByUsername?: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  aiSummary?: string;
  aiPriority?: TicketPriority;
  aiRefinedCategory?: TicketCategory;
  staffNotes?: string; // Internal notes visible only to staff
  embedMessageId?: string;
  createdAt: string; // ISO timestamp
}

// AI response shape
export interface AiClassification {
  priority: TicketPriority;
  summary: string;
  refined_category: TicketCategory;
}

// GitHub Issue creation response
export interface GitHubIssue {
  number: number;
  html_url: string;
  title: string;
}

// Button custom_id prefixes
export const ButtonId = {
  CREATE_BUG: 'create_ticket:bug',
  CREATE_FEATURE: 'create_ticket:feature',
  CREATE_FEEDBACK: 'create_ticket:feedback',
  CLAIM: 'ticket_claim',
  UNCLAIM: 'ticket_unclaim',
  CLOSE: 'ticket_close',
  CONFIRM_CLOSE: 'ticket_confirm_close',
  ADD_USER: 'ticket_add_user',
  REMOVE_USER: 'ticket_remove_user',
  STAFF_NOTE: 'ticket_staff_note',
  TEMPLATE_PREFIX: 'ticket_template:',
} as const;

// Response templates for quick replies
export const ResponseTemplates: Record<string, { label: string; emoji: string; message: string }> = {
  acknowledged: {
    label: 'Acknowledged',
    emoji: '✅',
    message: 'Thank you for your report! We have acknowledged this issue and it has been added to our backlog. We will update you when there is progress.',
  },
  investigating: {
    label: 'Investigating',
    emoji: '🔍',
    message: 'We are actively investigating this issue. Thank you for your patience!',
  },
  needs_info: {
    label: 'Need More Info',
    emoji: '❓',
    message: 'We need more information to proceed. Could you please provide additional details about the issue?',
  },
  resolved: {
    label: 'Resolved',
    emoji: '✨',
    message: 'This issue has been resolved! Thank you for your report. Please let us know if you encounter any further problems.',
  },
  wont_fix: {
    label: "Won't Fix",
    emoji: '🚫',
    message: "Thank you for your report. After review, we've determined this will not be addressed at this time. We appreciate your feedback.",
  },
} as const;

// Modal custom_id prefix
export const ModalId = {
  TICKET_FORM: 'ticket_form',
  STAFF_NOTE: 'staff_note',
  ADD_USER: 'add_user',
  FEEDBACK: 'feedback',
} as const;

// Colour palette
export const Colors = {
  TICKET_OPEN: 0xe8a838, // amber/gold — ESO themed
  TICKET_CLAIMED: 0x3498db, // blue — claimed
  TICKET_CLOSED: 0x95a5a6, // grey — closed
  PRIORITY_CRITICAL: 0xe74c3c, // red
  PRIORITY_HIGH: 0xe67e22, // orange
  PRIORITY_MEDIUM: 0xf1c40f, // yellow
  PRIORITY_LOW: 0x2ecc71, // green
  ROSTER_EMBED: 0xc8aa6e, // ESO gold — roster embeds
} as const;

// ── Roster button/modal IDs ────────────────────────────────────────────────

export const RosterButtonId = {
  SIGNUP_TANK: 'roster_signup:tank',
  SIGNUP_HEALER: 'roster_signup:healer',
  SIGNUP_DD: 'roster_signup:dd',
  VIEW_BUILDS: 'roster_view_builds',
  REFRESH: 'roster_refresh',
  SIGNUP_PREFIX: 'roster_signup:',
} as const;

export const RosterModalId = {
  CONFIG_NAME_PATTERN: 'roster_config:name_pattern',
} as const;
