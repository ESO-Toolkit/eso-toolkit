var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/types.ts
var InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5
};
var InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9
};
var MessageFlags = {
  EPHEMERAL: 64
};
var ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4
};
var ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5
};
var TextInputStyle = {
  SHORT: 1,
  PARAGRAPH: 2
};
var ChannelType = {
  GUILD_TEXT: 0
};
var ButtonId = {
  CREATE_BUG: "create_ticket:bug",
  CREATE_FEATURE: "create_ticket:feature",
  CREATE_FEEDBACK: "create_ticket:feedback",
  CLAIM: "ticket_claim",
  UNCLAIM: "ticket_unclaim",
  CLOSE: "ticket_close",
  CONFIRM_CLOSE: "ticket_confirm_close",
  REOPEN: "ticket_reopen",
  ADD_USER: "ticket_add_user",
  REMOVE_USER: "ticket_remove_user",
  STAFF_NOTE: "ticket_staff_note",
  TEMPLATE_PREFIX: "ticket_template:"
};
var ResponseTemplates = {
  acknowledged: {
    label: "Acknowledged",
    emoji: "\u2705",
    message: "Thank you for your report! We have acknowledged this issue and it has been added to our backlog. We will update you when there is progress."
  },
  investigating: {
    label: "Investigating",
    emoji: "\u{1F50D}",
    message: "We are actively investigating this issue. Thank you for your patience!"
  },
  needs_info: {
    label: "Need More Info",
    emoji: "\u2753",
    message: "We need more information to proceed. Could you please provide additional details about the issue?"
  },
  resolved: {
    label: "Resolved",
    emoji: "\u2728",
    message: "This issue has been resolved! Thank you for your report. Please let us know if you encounter any further problems."
  },
  wont_fix: {
    label: "Won't Fix",
    emoji: "\u{1F6AB}",
    message: "Thank you for your report. After review, we've determined this will not be addressed at this time. We appreciate your feedback."
  }
};
var ModalId = {
  TICKET_FORM: "ticket_form",
  STAFF_NOTE: "staff_note",
  ADD_USER: "add_user",
  FEEDBACK: "feedback"
};
var Colors = {
  TICKET_OPEN: 15247416,
  // amber/gold — ESO themed
  TICKET_CLAIMED: 3447003,
  // blue — claimed
  TICKET_CLOSED: 9807270,
  // grey — closed
  PRIORITY_CRITICAL: 15158332,
  // red
  PRIORITY_HIGH: 15105570,
  // orange
  PRIORITY_MEDIUM: 15844367,
  // yellow
  PRIORITY_LOW: 3066993
  // green
};

// src/buttons/add-user.ts
function handleAddUserButton(_env, interaction) {
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: ModalId.ADD_USER,
      title: "Add User to Ticket",
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: "user_input",
              label: "User ID or @mention",
              style: TextInputStyle.SHORT,
              placeholder: "e.g. 123456789012345678 or @username",
              required: true,
              min_length: 1,
              max_length: 100
            }
          ]
        }
      ]
    }
  };
}
__name(handleAddUserButton, "handleAddUserButton");

// src/discord.ts
var API_BASE = "https://discord.com/api/v10";
async function discordFetch(env, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "ESO-Toolkit-DiscordBot/1.0"
    },
    body: body !== void 0 ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status} on ${method} ${path}: ${text}`);
  }
  if (res.status === 204)
    return void 0;
  return res.json();
}
__name(discordFetch, "discordFetch");
function createChannel(env, guildId, options) {
  return discordFetch(env, "POST", `/guilds/${guildId}/channels`, options);
}
__name(createChannel, "createChannel");
function deleteChannel(env, channelId) {
  return discordFetch(env, "DELETE", `/channels/${channelId}`);
}
__name(deleteChannel, "deleteChannel");
function editChannelPermissions(env, channelId, overwriteId, data) {
  return discordFetch(env, "PUT", `/channels/${channelId}/permissions/${overwriteId}`, data);
}
__name(editChannelPermissions, "editChannelPermissions");
function deleteChannelPermission(env, channelId, overwriteId) {
  return discordFetch(env, "DELETE", `/channels/${channelId}/permissions/${overwriteId}`);
}
__name(deleteChannelPermission, "deleteChannelPermission");
async function addChannelPermission(env, channelId, userId, permissions) {
  let allowBits = 0n;
  let denyBits = 0n;
  for (const [perm, value] of Object.entries(permissions)) {
    const bit = Permission[perm];
    if (bit !== void 0) {
      if (value) {
        allowBits |= bit;
      } else {
        denyBits |= bit;
      }
    }
  }
  await editChannelPermissions(env, channelId, userId, {
    allow: allowBits.toString(),
    deny: denyBits.toString(),
    type: 1
    // member
  });
}
__name(addChannelPermission, "addChannelPermission");
function removeChannelPermission(env, channelId, userId) {
  return deleteChannelPermission(env, channelId, userId);
}
__name(removeChannelPermission, "removeChannelPermission");
function sendMessage(env, channelId, options) {
  return discordFetch(env, "POST", `/channels/${channelId}/messages`, options);
}
__name(sendMessage, "sendMessage");
function editMessage(env, channelId, messageId, options) {
  return discordFetch(
    env,
    "PATCH",
    `/channels/${channelId}/messages/${messageId}`,
    options
  );
}
__name(editMessage, "editMessage");
function getMessages(env, channelId, limit = 100) {
  return discordFetch(
    env,
    "GET",
    `/channels/${channelId}/messages?limit=${limit}`
  );
}
__name(getMessages, "getMessages");
function editFollowup(env, interactionToken, messageId, options) {
  return discordFetch(
    env,
    "PATCH",
    `/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/${messageId}`,
    options
  );
}
__name(editFollowup, "editFollowup");
function getGuildRoles(env, guildId) {
  return discordFetch(env, "GET", `/guilds/${guildId}/roles`);
}
__name(getGuildRoles, "getGuildRoles");
var Permission = {
  // Decimal values as bigint for safe bitwise ops
  MANAGE_CHANNELS: 1n << 4n,
  SEND_MESSAGES: 1n << 11n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  VIEW_CHANNEL: 1n << 10n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  ADD_REACTIONS: 1n << 6n,
  USE_EXTERNAL_EMOJIS: 1n << 18n
};
function allow(...perms) {
  return perms.reduce((acc, p) => acc | p, 0n).toString();
}
__name(allow, "allow");

// src/kv.ts
var COUNTER_KEY = "ticket-counter";
async function nextTicketId(env) {
  const raw = await env.TICKETS.get(COUNTER_KEY);
  const current = raw !== null ? parseInt(raw, 10) : 0;
  const next = current + 1;
  await env.TICKETS.put(COUNTER_KEY, String(next));
  return String(next).padStart(4, "0");
}
__name(nextTicketId, "nextTicketId");
async function putTicket(env, ticket) {
  await env.TICKETS.put(`ticket:${ticket.channelId}`, JSON.stringify(ticket));
}
__name(putTicket, "putTicket");
async function getTicket(env, channelId) {
  const raw = await env.TICKETS.get(`ticket:${channelId}`);
  if (raw === null)
    return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`[kv] failed to parse ticket for channel ${channelId}`);
    return null;
  }
}
__name(getTicket, "getTicket");
async function deleteTicket(env, channelId) {
  await env.TICKETS.delete(`ticket:${channelId}`);
}
__name(deleteTicket, "deleteTicket");
async function updateTicket(env, channelId, patch) {
  const existing = await getTicket(env, channelId);
  if (!existing)
    return null;
  const updated = { ...existing, ...patch };
  await putTicket(env, updated);
  return updated;
}
__name(updateTicket, "updateTicket");

// src/ai.ts
var ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
var MODEL = "glm-5";
var SYSTEM_PROMPT = 'You are a support ticket classifier for ESO Toolkit, an Elder Scrolls Online combat log analyzer. Analyze the ticket and return JSON only. The JSON must have exactly three keys: "priority" (one of: Low, Medium, High, Critical), "summary" (one sentence in plain English describing the issue), and "refined_category" (one of: Bug, Feature, Feedback). Do not include any text outside the JSON object.';
function buildUserMessage(category, title, description) {
  return `Category: ${category}
Title: ${title}
Description: ${description}`;
}
__name(buildUserMessage, "buildUserMessage");
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start)
    return null;
  return text.slice(start, end + 1);
}
__name(extractJson, "extractJson");
var VALID_PRIORITIES = /* @__PURE__ */ new Set(["Low", "Medium", "High", "Critical"]);
var VALID_CATEGORIES = /* @__PURE__ */ new Set(["Bug", "Feature", "Feedback"]);
function isValidPriority(v) {
  return VALID_PRIORITIES.has(v);
}
__name(isValidPriority, "isValidPriority");
function isValidCategory(v) {
  return VALID_CATEGORIES.has(v);
}
__name(isValidCategory, "isValidCategory");
async function classifyTicket(env, category, title, description) {
  try {
    const res = await fetch(ZAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ZAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(category, title, description) }
        ],
        temperature: 0.2,
        max_tokens: 256
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[ai] Z.AI API error ${res.status}: ${text}`);
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[ai] empty response from Z.AI");
      return null;
    }
    const jsonStr = extractJson(content);
    if (!jsonStr) {
      console.error("[ai] no JSON object found in response:", content);
      return null;
    }
    const parsed = JSON.parse(jsonStr);
    const priority = typeof parsed.priority === "string" && isValidPriority(parsed.priority) ? parsed.priority : "Medium";
    const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : "No summary available.";
    const refined_category = typeof parsed.refined_category === "string" && isValidCategory(parsed.refined_category) ? parsed.refined_category : category;
    return { priority, summary, refined_category };
  } catch (err) {
    console.error("[ai] classifyTicket error:", err);
    return null;
  }
}
__name(classifyTicket, "classifyTicket");

// src/github.ts
var GITHUB_API = "https://api.github.com";
async function createGitHubIssue(env, ticketId, title, description, username, userId, priority) {
  const body = buildIssueBody(ticketId, title, description, username, userId, priority);
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "ESO-Toolkit-DiscordBot/1.0",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({
          title: `[Discord Ticket #${ticketId}] ${title}`,
          body,
          labels: ["bug", "discord-ticket"]
        })
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[github] create issue failed ${res.status}: ${text}`);
      return null;
    }
    const issue = await res.json();
    return {
      number: issue.number,
      html_url: issue.html_url,
      title: issue.title
    };
  } catch (err) {
    console.error("[github] createGitHubIssue error:", err);
    return null;
  }
}
__name(createGitHubIssue, "createGitHubIssue");
function buildIssueBody(ticketId, title, description, username, userId, priority) {
  const priorityBadge = priority ? `**Priority:** ${priority}` : "";
  return `## Discord Support Ticket #${ticketId}

**Reported by:** ${username} (Discord ID: \`${userId}\`)
${priorityBadge}

---

## Description

${description}

---

*This issue was automatically created from a Discord support ticket in the ESO Toolkit server.*
*Ticket title: ${title}*`;
}
__name(buildIssueBody, "buildIssueBody");

// src/modals/ticket-form.ts
var PRIORITY_COLOR = {
  Critical: Colors.PRIORITY_CRITICAL,
  High: Colors.PRIORITY_HIGH,
  Medium: Colors.PRIORITY_MEDIUM,
  Low: Colors.PRIORITY_LOW
};
var CATEGORY_EMOJI = {
  Bug: "\u{1F41B}",
  Feature: "\u{1F4A1}",
  Feedback: "\u{1F4AC}"
};
function buildTicketEmbed(ticket) {
  const color = ticket.status === "closed" ? Colors.TICKET_CLOSED : ticket.status === "claimed" ? Colors.TICKET_CLAIMED : ticket.aiPriority ? PRIORITY_COLOR[ticket.aiPriority] ?? Colors.TICKET_OPEN : Colors.TICKET_OPEN;
  const categoryLabel = ticket.aiRefinedCategory ?? ticket.category;
  const categoryEmoji = CATEGORY_EMOJI[categoryLabel] ?? "\u{1F3AB}";
  const fields = [
    { name: "Category", value: `${categoryEmoji} ${categoryLabel}`, inline: true },
    { name: "Status", value: capitalise(ticket.status), inline: true },
    {
      name: "Priority",
      value: ticket.aiPriority ?? "_Pending AI analysis\u2026_",
      inline: true
    },
    {
      name: "Assigned To",
      value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "_Unclaimed_",
      inline: true
    }
  ];
  if (ticket.aiSummary) {
    fields.push({ name: "\u{1F916} AI Summary", value: ticket.aiSummary, inline: false });
  }
  if (ticket.githubIssueUrl) {
    fields.push({
      name: "\u{1F419} GitHub Issue",
      value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`,
      inline: true
    });
  }
  if (ticket.staffNotes) {
    fields.push({
      name: "\u{1F4DD} Staff Notes",
      value: ticket.staffNotes,
      inline: false
    });
  }
  const openedAt = new Date(ticket.createdAt);
  const timeStr = openedAt.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  return {
    color,
    title: `\u{1F3AB} Ticket #${ticket.id} \u2014 ${ticket.title}`,
    description: ticket.description,
    fields,
    footer: {
      text: `Opened by ${ticket.username} \u2022 ${timeStr}`
    },
    timestamp: ticket.createdAt
  };
}
__name(buildTicketEmbed, "buildTicketEmbed");
function buildTicketActionRows(ticket) {
  const closed = ticket.status === "closed";
  const claimed = !!ticket.claimedBy;
  const primaryRow = {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.PRIMARY,
        label: claimed ? "Unclaim" : "Claim",
        emoji: { name: claimed ? "\u21A9\uFE0F" : "\u{1F64B}" },
        custom_id: claimed ? ButtonId.UNCLAIM : ButtonId.CLAIM,
        disabled: closed
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SUCCESS,
        label: "Close",
        emoji: { name: "\u2705" },
        custom_id: ButtonId.CLOSE,
        disabled: closed
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: "Add User",
        emoji: { name: "\u2795" },
        custom_id: ButtonId.ADD_USER,
        disabled: closed
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: "Remove User",
        emoji: { name: "\u2796" },
        custom_id: ButtonId.REMOVE_USER,
        disabled: closed
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: "Note",
        emoji: { name: "\u{1F4DD}" },
        custom_id: ButtonId.STAFF_NOTE,
        disabled: closed
      }
    ]
  };
  const templateRow = {
    type: ComponentType.ACTION_ROW,
    components: Object.entries(ResponseTemplates).map(([key, template]) => ({
      type: ComponentType.BUTTON,
      style: ButtonStyle.SECONDARY,
      label: template.label,
      emoji: { name: template.emoji },
      custom_id: `${ButtonId.TEMPLATE_PREFIX}${key}`,
      disabled: closed
    }))
  };
  return [primaryRow, templateRow];
}
__name(buildTicketActionRows, "buildTicketActionRows");
async function handleTicketFormModal(env, interaction, ctx) {
  const customId = interaction.data?.custom_id ?? "";
  const categoryRaw = customId.split(":")[1];
  const category = categoryRaw && ["Bug", "Feature", "Feedback"].includes(categoryRaw) ? categoryRaw : "Feedback";
  const components = interaction.data?.components ?? [];
  const title = findInputValue(components, "ticket_title") ?? "Untitled";
  const description = findInputValue(components, "ticket_description") ?? "(no description)";
  const user = interaction.member?.user ?? interaction.user;
  if (!user) {
    return deferred();
  }
  ctx.waitUntil(
    processTicketCreation(env, interaction, user, category, title, description)
  );
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 }
    // ephemeral deferred
  };
}
__name(handleTicketFormModal, "handleTicketFormModal");
async function processTicketCreation(env, interaction, user, category, title, description) {
  try {
    const ticketId = await nextTicketId(env);
    const overwrites = await buildPermissionOverwrites(env, user.id);
    const channelName = `ticket-${ticketId}`;
    const channel = await createChannel(env, env.GUILD_ID, {
      name: channelName,
      type: ChannelType.GUILD_TEXT,
      parent_id: env.TICKET_CATEGORY_ID,
      topic: `Support ticket #${ticketId} \u2014 ${title}`,
      permission_overwrites: overwrites
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ticket = {
      id: ticketId,
      channelId: channel.id,
      userId: user.id,
      username: user.username,
      category,
      title,
      description,
      status: "open",
      createdAt: now
    };
    await putTicket(env, ticket);
    const embed = buildTicketEmbed(ticket);
    const actionRows = buildTicketActionRows(ticket);
    const embedMsg = await sendMessage(env, channel.id, {
      content: `<@${user.id}> Your ticket has been created. Staff will be with you shortly.`,
      embeds: [embed],
      components: actionRows
    });
    ticket.embedMessageId = embedMsg.id;
    await putTicket(env, ticket);
    const [aiResult, githubIssue] = await Promise.allSettled([
      classifyTicket(env, category, title, description),
      category === "Bug" ? createGitHubIssue(env, ticketId, title, description, user.username, user.id, void 0) : Promise.resolve(null)
    ]);
    const ai = aiResult.status === "fulfilled" ? aiResult.value : null;
    const github = githubIssue.status === "fulfilled" ? githubIssue.value : null;
    const updatedTicket = await updateTicket(env, channel.id, {
      aiPriority: ai?.priority,
      aiSummary: ai?.summary,
      aiRefinedCategory: ai?.refined_category,
      githubIssueNumber: github?.number,
      githubIssueUrl: github?.html_url
    });
    if (updatedTicket) {
      await editMessage(env, channel.id, embedMsg.id, {
        content: `<@${user.id}> Your ticket has been created. Staff will be with you shortly.`,
        embeds: [buildTicketEmbed(updatedTicket)],
        components: buildTicketActionRows(updatedTicket)
      });
    }
    await editFollowup(env, interaction.token, "@original", {
      content: `\u2705 Your ticket **#${ticketId}** has been created: <#${channel.id}>`
    });
  } catch (err) {
    console.error("[ticket-form] processTicketCreation error:", err);
    try {
      await editFollowup(env, interaction.token, "@original", {
        content: "\u274C Something went wrong creating your ticket. Please try again or contact a staff member."
      });
    } catch (followupErr) {
      console.error("[ticket-form] failed to send error followup:", followupErr);
    }
  }
}
__name(processTicketCreation, "processTicketCreation");
async function buildPermissionOverwrites(env, userId) {
  const memberPerms = allow(
    Permission.VIEW_CHANNEL,
    Permission.SEND_MESSAGES,
    Permission.READ_MESSAGE_HISTORY,
    Permission.EMBED_LINKS,
    Permission.ATTACH_FILES,
    Permission.ADD_REACTIONS,
    Permission.USE_EXTERNAL_EMOJIS
  );
  const overwrites = [
    // Deny @everyone (role id = guild id)
    { id: env.GUILD_ID, type: 0, deny: allow(Permission.VIEW_CHANNEL) },
    // Allow ticket creator
    { id: userId, type: 1, allow: memberPerms }
  ];
  try {
    const roles = await getGuildRoles(env, env.GUILD_ID);
    for (const role of roles) {
      const perms = BigInt(role.permissions);
      if ((perms & Permission.MANAGE_CHANNELS) === Permission.MANAGE_CHANNELS) {
        overwrites.push({ id: role.id, type: 0, allow: memberPerms });
      }
    }
  } catch (err) {
    console.error("[ticket-form] failed to fetch guild roles:", err);
  }
  return overwrites;
}
__name(buildPermissionOverwrites, "buildPermissionOverwrites");
function findInputValue(rows, customId) {
  for (const row of rows) {
    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId)
        return comp.value;
    }
  }
  return void 0;
}
__name(findInputValue, "findInputValue");
function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
__name(capitalise, "capitalise");
function deferred() {
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 }
  };
}
__name(deferred, "deferred");

// src/buttons/claim.ts
async function handleClaimButton(env, interaction, ctx) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral("This channel does not have an associated ticket.");
  }
  if (ticket.status === "closed") {
    return ephemeral("This ticket has already been closed.");
  }
  const claimingUser = interaction.member?.user ?? interaction.user;
  if (!claimingUser) {
    return ephemeral("Could not determine your user identity.");
  }
  if (ticket.claimedBy === claimingUser.id) {
    return ephemeral("You have already claimed this ticket.");
  }
  const updated = await updateTicket(env, channelId, {
    status: "claimed",
    claimedBy: claimingUser.id,
    claimedByUsername: claimingUser.username
  });
  if (!updated) {
    return ephemeral("Failed to update the ticket. Please try again.");
  }
  if (ticket.embedMessageId) {
    ctx.waitUntil(
      (async () => {
        try {
          await editMessage(env, channelId, ticket.embedMessageId, {
            embeds: [buildTicketEmbed(updated)],
            components: buildTicketActionRows(updated)
          });
        } catch (err) {
          console.error("[claim] failed to edit embed:", err);
        }
      })()
    );
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u2705 <@${claimingUser.id}> has claimed this ticket.`
    }
  };
}
__name(handleClaimButton, "handleClaimButton");
function ephemeral(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral, "ephemeral");

// src/buttons/close.ts
function handleCloseButton(_env, _interaction) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "\u26A0\uFE0F Are you sure you want to close this ticket? This will save a transcript and delete the channel.",
      flags: MessageFlags.EPHEMERAL,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.DANGER,
              label: "Yes, close it",
              emoji: { name: "\u{1F512}" },
              custom_id: ButtonId.CONFIRM_CLOSE
            }
          ]
        }
      ]
    }
  };
}
__name(handleCloseButton, "handleCloseButton");

// src/buttons/confirm-close.ts
async function handleConfirmCloseButton(env, interaction, ctx) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral2("Could not determine the ticket channel.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral2("This channel does not have an associated ticket.");
  }
  if (ticket.status === "closed") {
    return ephemeral2("This ticket is already closed.");
  }
  const closingUser = interaction.member?.user ?? interaction.user;
  ctx.waitUntil(closeTicket(env, ticket, channelId, closingUser?.username ?? "Unknown"));
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "\u{1F512} Closing ticket \u2014 saving transcript and deleting channel\u2026",
      flags: MessageFlags.EPHEMERAL
    }
  };
}
__name(handleConfirmCloseButton, "handleConfirmCloseButton");
async function closeTicket(env, ticket, channelId, closedByUsername) {
  try {
    let messages = [];
    try {
      messages = await getMessages(env, channelId, 100);
    } catch (err) {
      console.error("[confirm-close] failed to fetch messages:", err);
    }
    const transcriptLines = messages.filter((m) => !m.author?.username?.endsWith("#0000") && m.content.trim().length > 0).slice(0, 10).reverse().map((m) => `**${m.author?.username ?? "Unknown"}**: ${m.content.slice(0, 200)}`);
    const transcriptText = transcriptLines.length > 0 ? transcriptLines.join("\n") : "_No messages recorded._";
    const openedAt = new Date(ticket.createdAt);
    const closedAt = /* @__PURE__ */ new Date();
    const durationMs = closedAt.getTime() - openedAt.getTime();
    const durationStr = formatDuration(durationMs);
    const logEmbed = {
      color: Colors.TICKET_CLOSED,
      title: `\u{1F4CB} Ticket #${ticket.id} Closed`,
      description: transcriptText,
      fields: [
        { name: "Opened by", value: `<@${ticket.userId}> (${ticket.username})`, inline: true },
        { name: "Category", value: ticket.aiRefinedCategory ?? ticket.category, inline: true },
        {
          name: "Claimed by",
          value: ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedByUsername})` : "Unclaimed",
          inline: true
        },
        { name: "Closed by", value: closedByUsername, inline: true },
        { name: "Duration", value: durationStr, inline: true },
        ...ticket.githubIssueUrl ? [{ name: "GitHub Issue", value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`, inline: true }] : [],
        ...ticket.aiSummary ? [{ name: "AI Summary", value: ticket.aiSummary, inline: false }] : []
      ],
      footer: {
        text: `Ticket ID: ${ticket.id} \u2022 Total messages: ${messages.length}`
      },
      timestamp: closedAt.toISOString()
    };
    try {
      await sendMessage(env, env.TICKET_LOGS_CHANNEL_ID, { embeds: [logEmbed] });
    } catch (err) {
      console.error("[confirm-close] failed to post transcript:", err);
    }
    try {
      await deleteChannel(env, channelId);
    } catch (err) {
      console.error("[confirm-close] failed to delete channel:", err);
    }
    await deleteTicket(env, channelId);
  } catch (err) {
    console.error("[confirm-close] unexpected error during closeTicket:", err);
  }
}
__name(closeTicket, "closeTicket");
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1e3);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const parts = [];
  if (days > 0)
    parts.push(`${days}d`);
  if (hours > 0)
    parts.push(`${hours}h`);
  if (minutes > 0)
    parts.push(`${minutes}m`);
  if (parts.length === 0)
    parts.push("<1m");
  return parts.join(" ");
}
__name(formatDuration, "formatDuration");
function ephemeral2(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral2, "ephemeral");

// src/buttons/create-ticket.ts
var CATEGORY_LABELS = {
  [ButtonId.CREATE_BUG]: { label: "Bug Report", emoji: "\u{1F41B}" },
  [ButtonId.CREATE_FEATURE]: { label: "Feature Request", emoji: "\u{1F4A1}" },
  [ButtonId.CREATE_FEEDBACK]: { label: "General Feedback", emoji: "\u{1F4AC}" }
};
var BUTTON_TO_CATEGORY = {
  [ButtonId.CREATE_BUG]: "Bug",
  [ButtonId.CREATE_FEATURE]: "Feature",
  [ButtonId.CREATE_FEEDBACK]: "Feedback"
};
function handleCreateTicketButton(_env, interaction) {
  const customId = interaction.data?.custom_id ?? "";
  const meta = CATEGORY_LABELS[customId] ?? { label: "Support", emoji: "\u{1F3AB}" };
  const category = BUTTON_TO_CATEGORY[customId] ?? "Feedback";
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: `${ModalId.TICKET_FORM}:${category}`,
      title: `${meta.emoji} New ${meta.label}`,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: "ticket_title",
              label: "Short title (summarise your request)",
              style: TextInputStyle.SHORT,
              min_length: 5,
              max_length: 100,
              required: true,
              placeholder: "e.g. Parser crashes on large log files"
            }
          ]
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: "ticket_description",
              label: "Describe the issue in detail",
              style: TextInputStyle.PARAGRAPH,
              min_length: 20,
              max_length: 2e3,
              required: true,
              placeholder: "Include steps to reproduce, expected vs actual behaviour, screenshots, log IDs, etc."
            }
          ]
        }
      ]
    }
  };
}
__name(handleCreateTicketButton, "handleCreateTicketButton");

// src/buttons/remove-user.ts
function handleRemoveUserButton(_env, interaction) {
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: `${ModalId.ADD_USER}:remove`,
      // Reuse add modal with remove flag
      title: "Remove User from Ticket",
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: "user_input",
              label: "User ID or @mention",
              style: TextInputStyle.SHORT,
              placeholder: "e.g. 123456789012345678 or @username",
              required: true,
              min_length: 1,
              max_length: 100
            }
          ]
        }
      ]
    }
  };
}
__name(handleRemoveUserButton, "handleRemoveUserButton");

// src/buttons/staff-note.ts
function handleStaffNoteButton(_env, interaction) {
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: ModalId.STAFF_NOTE,
      title: "Staff Notes",
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: "note_content",
              label: "Internal Notes (staff only)",
              style: TextInputStyle.PARAGRAPH,
              placeholder: "Add notes about this ticket that only staff can see...",
              required: false,
              max_length: 1e3
            }
          ]
        }
      ]
    }
  };
}
__name(handleStaffNoteButton, "handleStaffNoteButton");
async function handleStaffNoteModal(env, interaction, ctx) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral3("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral3("This channel does not have an associated ticket.");
  }
  const components = interaction.data?.components ?? [];
  const noteContent = findInputValue2(components, "note_content") ?? "";
  const staffUser = interaction.member?.user ?? interaction.user;
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  });
  let newNotes = ticket.staffNotes || "";
  if (noteContent.trim()) {
    newNotes = `${newNotes}
[${timestamp}] **${staffUser?.username ?? "Staff"}**: ${noteContent}`.trim();
  }
  const updated = await updateTicket(env, channelId, {
    staffNotes: newNotes || void 0
  });
  if (!updated) {
    return ephemeral3("Failed to update the ticket. Please try again.");
  }
  if (ticket.embedMessageId) {
    ctx.waitUntil(
      (async () => {
        try {
          const rows = buildTicketActionRows(updated);
          await editMessage(env, channelId, ticket.embedMessageId, {
            embeds: [buildTicketEmbed(updated)],
            components: rows
          });
        } catch (err) {
          console.error("[staff-note] failed to edit embed:", err);
        }
      })()
    );
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: noteContent.trim() ? "\u{1F4DD} Staff note added successfully." : "\u{1F4DD} Staff notes cleared.",
      flags: MessageFlags.EPHEMERAL
    }
  };
}
__name(handleStaffNoteModal, "handleStaffNoteModal");
function findInputValue2(rows, customId) {
  for (const row of rows) {
    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId)
        return comp.value;
    }
  }
  return void 0;
}
__name(findInputValue2, "findInputValue");
function ephemeral3(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral3, "ephemeral");

// src/buttons/template-response.ts
async function handleTemplateButton(env, interaction, templateKey) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral4("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral4("This channel does not have an associated ticket.");
  }
  if (ticket.status === "closed") {
    return ephemeral4("This ticket has been closed.");
  }
  const template = ResponseTemplates[templateKey];
  if (!template) {
    return ephemeral4(`Unknown template: ${templateKey}`);
  }
  const staffUser = interaction.member?.user ?? interaction.user;
  try {
    await sendMessage(env, channelId, {
      content: `${template.emoji} **${template.label}**

${template.message}

_\u2014 <@${staffUser?.id}>_`
    });
  } catch (err) {
    console.error("[template] failed to send message:", err);
    return ephemeral4("Failed to send the response. Please try again.");
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u2705 Posted "${template.label}" response.`,
      flags: MessageFlags.EPHEMERAL
    }
  };
}
__name(handleTemplateButton, "handleTemplateButton");
function ephemeral4(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral4, "ephemeral");

// src/buttons/unclaim.ts
async function handleUnclaimButton(env, interaction, ctx) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral5("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral5("This channel does not have an associated ticket.");
  }
  if (ticket.status === "closed") {
    return ephemeral5("This ticket has been closed.");
  }
  const unclaimingUser = interaction.member?.user ?? interaction.user;
  if (!unclaimingUser) {
    return ephemeral5("Could not determine your user identity.");
  }
  if (ticket.claimedBy !== unclaimingUser.id) {
    const hasPerms = interaction.member?.permissions ? (BigInt(interaction.member.permissions) & 0x10n) !== 0n : false;
    if (!hasPerms) {
      return ephemeral5("Only the person who claimed this ticket or a moderator can unclaim it.");
    }
  }
  const updated = await updateTicket(env, channelId, {
    status: "open",
    claimedBy: void 0,
    claimedByUsername: void 0,
    claimedAt: void 0
  });
  if (!updated) {
    return ephemeral5("Failed to update the ticket. Please try again.");
  }
  if (ticket.embedMessageId) {
    ctx.waitUntil(
      (async () => {
        try {
          const rows = buildTicketActionRows(updated);
          await editMessage(env, channelId, ticket.embedMessageId, {
            embeds: [buildTicketEmbed(updated)],
            components: rows
          });
        } catch (err) {
          console.error("[unclaim] failed to edit embed:", err);
        }
      })()
    );
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u21A9\uFE0F <@${unclaimingUser.id}> has released their claim on this ticket.`
    }
  };
}
__name(handleUnclaimButton, "handleUnclaimButton");
function ephemeral5(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral5, "ephemeral");

// src/handlers/buttons.ts
async function handleButton(env, interaction, ctx) {
  const customId = interaction.data?.custom_id ?? "";
  if (customId === ButtonId.CREATE_BUG || customId === ButtonId.CREATE_FEATURE || customId === ButtonId.CREATE_FEEDBACK) {
    return handleCreateTicketButton(env, interaction);
  }
  if (customId.startsWith(ButtonId.TEMPLATE_PREFIX)) {
    const templateKey = customId.slice(ButtonId.TEMPLATE_PREFIX.length);
    return handleTemplateButton(env, interaction, templateKey);
  }
  switch (customId) {
    case ButtonId.CLAIM:
      return handleClaimButton(env, interaction, ctx);
    case ButtonId.UNCLAIM:
      return handleUnclaimButton(env, interaction, ctx);
    case ButtonId.CLOSE:
      return handleCloseButton(env, interaction);
    case ButtonId.CONFIRM_CLOSE:
      return handleConfirmCloseButton(env, interaction, ctx);
    case ButtonId.ADD_USER:
      return handleAddUserButton(env, interaction);
    case ButtonId.REMOVE_USER:
      return handleRemoveUserButton(env, interaction);
    case ButtonId.STAFF_NOTE:
      return handleStaffNoteButton(env, interaction);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `\u274C Unknown button: \`${customId}\``,
          flags: MessageFlags.EPHEMERAL
        }
      };
  }
}
__name(handleButton, "handleButton");

// src/commands/ticket-add.ts
async function handleTicketAdd(env, interaction) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral6("\u274C Could not determine the current channel.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral6("\u274C This command can only be used inside a ticket channel.");
  }
  const userOption = interaction.data?.options?.find((o) => o.name === "user");
  const targetUserId = typeof userOption?.value === "string" ? userOption.value : null;
  if (!targetUserId) {
    return ephemeral6("\u274C Please specify a user to add.");
  }
  const resolved = interaction.data?.resolved;
  const targetUser = resolved?.users?.[targetUserId];
  const targetUsername = targetUser?.username ?? `<@${targetUserId}>`;
  try {
    await editChannelPermissions(env, channelId, targetUserId, {
      type: 1,
      // member
      allow: allow(
        Permission.VIEW_CHANNEL,
        Permission.SEND_MESSAGES,
        Permission.READ_MESSAGE_HISTORY,
        Permission.EMBED_LINKS,
        Permission.ATTACH_FILES,
        Permission.ADD_REACTIONS,
        Permission.USE_EXTERNAL_EMOJIS
      )
    });
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `\u2705 Added **${targetUsername}** (<@${targetUserId}>) to the ticket.`
      }
    };
  } catch (err) {
    console.error("[ticket-add] failed to add user:", err);
    return ephemeral6("\u274C Failed to add the user. Check bot permissions and try again.");
  }
}
__name(handleTicketAdd, "handleTicketAdd");
function ephemeral6(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral6, "ephemeral");

// src/commands/ticket-close.ts
async function handleTicketClose(env, interaction, ctx) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral7("\u274C Could not determine the current channel.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral7("\u274C This command can only be used inside a ticket channel.");
  }
  if (ticket.status === "closed") {
    return ephemeral7("\u274C This ticket is already closed.");
  }
  const reasonOption = interaction.data?.options?.find((o) => o.name === "reason");
  const reason = typeof reasonOption?.value === "string" ? reasonOption.value : "No reason given";
  const closingUser = interaction.member?.user ?? interaction.user;
  const closedByUsername = closingUser?.username ?? "Unknown";
  ctx.waitUntil(closeTicketWorkflow(env, channelId, ticket.id, reason, closedByUsername));
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL }
  };
}
__name(handleTicketClose, "handleTicketClose");
async function closeTicketWorkflow(env, channelId, ticketId, reason, closedByUsername) {
  const ticket = await getTicket(env, channelId);
  if (!ticket)
    return;
  let messages = [];
  try {
    messages = await getMessages(env, channelId, 100);
  } catch (err) {
    console.error("[ticket-close] failed to fetch messages:", err);
  }
  const transcriptLines = messages.filter((m) => !m.author?.username?.endsWith("#0000") && m.content.trim().length > 0).slice(0, 10).reverse().map((m) => `**${m.author?.username ?? "Unknown"}**: ${m.content.slice(0, 200)}`);
  const transcriptText = transcriptLines.length > 0 ? transcriptLines.join("\n") : "_No messages recorded._";
  const openedAt = new Date(ticket.createdAt);
  const closedAt = /* @__PURE__ */ new Date();
  const durationMs = closedAt.getTime() - openedAt.getTime();
  const durationStr = formatDuration2(durationMs);
  try {
    await sendMessage(env, env.TICKET_LOGS_CHANNEL_ID, {
      embeds: [
        {
          color: Colors.TICKET_CLOSED,
          title: `\u{1F4CB} Ticket #${ticketId} Closed`,
          description: transcriptText,
          fields: [
            { name: "Opened by", value: `<@${ticket.userId}> (${ticket.username})`, inline: true },
            { name: "Category", value: ticket.aiRefinedCategory ?? ticket.category, inline: true },
            {
              name: "Claimed by",
              value: ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedByUsername})` : "Unclaimed",
              inline: true
            },
            { name: "Closed by", value: closedByUsername, inline: true },
            { name: "Reason", value: reason, inline: true },
            { name: "Duration", value: durationStr, inline: true },
            ...ticket.githubIssueUrl ? [
              {
                name: "GitHub Issue",
                value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`,
                inline: true
              }
            ] : [],
            ...ticket.aiSummary ? [{ name: "AI Summary", value: ticket.aiSummary, inline: false }] : []
          ],
          footer: { text: `Ticket ID: ${ticketId} \u2022 Total messages: ${messages.length}` },
          timestamp: closedAt.toISOString()
        }
      ]
    });
  } catch (err) {
    console.error("[ticket-close] failed to post transcript:", err);
  }
  try {
    await deleteChannel(env, channelId);
  } catch (err) {
    console.error("[ticket-close] failed to delete channel:", err);
  }
  await deleteTicket(env, channelId);
}
__name(closeTicketWorkflow, "closeTicketWorkflow");
function formatDuration2(ms) {
  const totalSeconds = Math.floor(ms / 1e3);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const parts = [];
  if (days > 0)
    parts.push(`${days}d`);
  if (hours > 0)
    parts.push(`${hours}h`);
  if (minutes > 0)
    parts.push(`${minutes}m`);
  if (parts.length === 0)
    parts.push("<1m");
  return parts.join(" ");
}
__name(formatDuration2, "formatDuration");
function ephemeral7(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral7, "ephemeral");

// src/commands/ticket-remove.ts
async function handleTicketRemove(env, interaction) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral8("\u274C Could not determine the current channel.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral8("\u274C This command can only be used inside a ticket channel.");
  }
  const userOption = interaction.data?.options?.find((o) => o.name === "user");
  const targetUserId = typeof userOption?.value === "string" ? userOption.value : null;
  if (!targetUserId) {
    return ephemeral8("\u274C Please specify a user to remove.");
  }
  if (targetUserId === ticket.userId) {
    return ephemeral8("\u274C You cannot remove the ticket creator from their own ticket.");
  }
  const resolved = interaction.data?.resolved;
  const targetUser = resolved?.users?.[targetUserId];
  const targetUsername = targetUser?.username ?? `<@${targetUserId}>`;
  try {
    await deleteChannelPermission(env, channelId, targetUserId);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `\u2705 Removed **${targetUsername}** (<@${targetUserId}>) from the ticket.`
      }
    };
  } catch (err) {
    console.error("[ticket-remove] failed to remove user:", err);
    return ephemeral8("\u274C Failed to remove the user. Check bot permissions and try again.");
  }
}
__name(handleTicketRemove, "handleTicketRemove");
function ephemeral8(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral8, "ephemeral");

// src/commands/ticket-setup.ts
var ADMINISTRATOR = 1n << 3n;
async function handleTicketSetup(env, interaction, ctx) {
  const permsStr = interaction.member?.permissions;
  if (!permsStr) {
    return ephemeral9("\u274C Could not verify your permissions.");
  }
  const perms = BigInt(permsStr);
  const isAdmin = (perms & ADMINISTRATOR) === ADMINISTRATOR;
  if (!isAdmin) {
    return ephemeral9("\u274C You need the **Administrator** permission to run this command.");
  }
  ctx.waitUntil(postPanel(env, interaction));
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL }
  };
}
__name(handleTicketSetup, "handleTicketSetup");
async function postPanel(env, interaction) {
  try {
    await sendMessage(env, env.PANEL_CHANNEL_ID, {
      embeds: [
        {
          color: Colors.TICKET_OPEN,
          title: "\u{1F3AB} ESO Toolkit \u2014 Support",
          description: "Need help with ESO Toolkit? Click the button below that best describes your request.\n\n**\u{1F41B} Bug Report** \u2014 Something is broken or not working as expected.\n**\u{1F4A1} Feature Request** \u2014 You have an idea for a new feature or improvement.\n**\u{1F4AC} General Feedback** \u2014 Questions, suggestions, or anything else.",
          footer: {
            text: "A private channel will be created for your request. Please be as detailed as possible."
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.DANGER,
              label: "Bug Report",
              emoji: { name: "\u{1F41B}" },
              custom_id: ButtonId.CREATE_BUG
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.PRIMARY,
              label: "Feature Request",
              emoji: { name: "\u{1F4A1}" },
              custom_id: ButtonId.CREATE_FEATURE
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.SECONDARY,
              label: "General Feedback",
              emoji: { name: "\u{1F4AC}" },
              custom_id: ButtonId.CREATE_FEEDBACK
            }
          ]
        }
      ]
    });
    await editFollowup(env, interaction.token, "@original", {
      content: `\u2705 Ticket panel posted in <#${env.PANEL_CHANNEL_ID}>.`
    });
  } catch (err) {
    console.error("[ticket-setup] failed to post panel:", err);
    try {
      await editFollowup(env, interaction.token, "@original", {
        content: "\u274C Failed to post the panel. Check bot permissions in the channel."
      });
    } catch {
    }
  }
}
__name(postPanel, "postPanel");
function ephemeral9(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral9, "ephemeral");

// src/handlers/commands.ts
async function handleCommand(env, interaction, ctx) {
  const name = interaction.data?.name;
  if (name !== "ticket") {
    return unknownCommand(name ?? "");
  }
  const subOptions = interaction.data?.options ?? [];
  const sub = subOptions[0];
  const subName = sub?.name;
  switch (subName) {
    case "setup":
      return handleTicketSetup(env, interaction, ctx);
    case "close":
      return handleTicketClose(env, interaction, ctx);
    case "add":
      if (!sub)
        return unknownCommand("ticket add");
      return handleTicketAdd(env, withSubOptions(interaction, sub));
    case "remove":
      if (!sub)
        return unknownCommand("ticket remove");
      return handleTicketRemove(env, withSubOptions(interaction, sub));
    default:
      return unknownCommand(`ticket ${subName ?? "(none)"}`);
  }
}
__name(handleCommand, "handleCommand");
function withSubOptions(interaction, sub) {
  const data = interaction.data ?? {};
  return {
    ...interaction,
    data: {
      ...data,
      options: sub.options ?? []
    }
  };
}
__name(withSubOptions, "withSubOptions");
function unknownCommand(name) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u274C Unknown command: \`${name}\``,
      flags: MessageFlags.EPHEMERAL
    }
  };
}
__name(unknownCommand, "unknownCommand");

// src/modals/user-management.ts
async function handleAddUserModal(env, interaction) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral10("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral10("This channel does not have an associated ticket.");
  }
  const components = interaction.data?.components ?? [];
  const userInput = findInputValue3(components, "user_input")?.trim();
  if (!userInput) {
    return ephemeral10("Please provide a user ID or mention.");
  }
  let userId = userInput;
  const mentionMatch = userInput.match(/<@!?(\d+)>/);
  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (!/^\d{17,20}$/.test(userId)) {
    return ephemeral10("Invalid user ID format. Please use a numeric ID or @mention.");
  }
  try {
    await addChannelPermission(env, channelId, userId, {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      READ_MESSAGE_HISTORY: true,
      EMBED_LINKS: true,
      ATTACH_FILES: true
    });
  } catch (err) {
    console.error("[add-user] failed to add permission:", err);
    return ephemeral10("Failed to add user to the ticket. Please check the user ID and try again.");
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u2795 Added <@${userId}> to this ticket.`
    }
  };
}
__name(handleAddUserModal, "handleAddUserModal");
async function handleRemoveUserModal(env, interaction) {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral10("Could not determine the channel for this ticket.");
  }
  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral10("This channel does not have an associated ticket.");
  }
  const components = interaction.data?.components ?? [];
  const userInput = findInputValue3(components, "user_input")?.trim();
  if (!userInput) {
    return ephemeral10("Please provide a user ID or mention.");
  }
  let userId = userInput;
  const mentionMatch = userInput.match(/<@!?(\d+)>/);
  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (!/^\d{17,20}$/.test(userId)) {
    return ephemeral10("Invalid user ID format. Please use a numeric ID or @mention.");
  }
  if (userId === ticket.userId) {
    return ephemeral10("Cannot remove the ticket creator from their own ticket.");
  }
  try {
    await removeChannelPermission(env, channelId, userId);
  } catch (err) {
    console.error("[remove-user] failed to remove permission:", err);
    return ephemeral10("Failed to remove user from the ticket. Please check the user ID and try again.");
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u2796 Removed <@${userId}> from this ticket.`
    }
  };
}
__name(handleRemoveUserModal, "handleRemoveUserModal");
function findInputValue3(rows, customId) {
  for (const row of rows) {
    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId)
        return comp.value;
    }
  }
  return void 0;
}
__name(findInputValue3, "findInputValue");
function ephemeral10(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL }
  };
}
__name(ephemeral10, "ephemeral");

// src/handlers/modals.ts
async function handleModal(env, interaction, ctx) {
  const customId = interaction.data?.custom_id ?? "";
  if (customId.startsWith(ModalId.TICKET_FORM)) {
    return handleTicketFormModal(env, interaction, ctx);
  }
  if (customId === ModalId.STAFF_NOTE) {
    return handleStaffNoteModal(env, interaction, ctx);
  }
  if (customId === ModalId.ADD_USER) {
    return handleAddUserModal(env, interaction);
  }
  if (customId === `${ModalId.ADD_USER}:remove`) {
    return handleRemoveUserModal(env, interaction);
  }
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u274C Unknown modal: \`${customId}\``,
      flags: MessageFlags.EPHEMERAL
    }
  };
}
__name(handleModal, "handleModal");

// src/verify.ts
function hexToUint8Array(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}
__name(hexToUint8Array, "hexToUint8Array");
async function verifyDiscordSignature(publicKey, signature, timestamp, body) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToUint8Array(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToUint8Array(signature),
      new TextEncoder().encode(timestamp + body)
    );
    return valid;
  } catch (err) {
    console.error("[verify] signature verification error:", err);
    return false;
  }
}
__name(verifyDiscordSignature, "verifyDiscordSignature");

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 401 });
    }
    const body = await request.text();
    const isValid = await verifyDiscordSignature(
      env.DISCORD_PUBLIC_KEY,
      signature,
      timestamp,
      body
    );
    if (!isValid) {
      return new Response("Invalid request signature", { status: 401 });
    }
    let interaction;
    try {
      interaction = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
    try {
      const response = await routeInteraction(env, interaction, ctx);
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("[index] unhandled error:", err);
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "\u274C An internal error occurred. Please try again.",
            flags: 64
          }
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
async function routeInteraction(env, interaction, ctx) {
  switch (interaction.type) {
    case InteractionType.PING:
      return { type: 1 };
    case InteractionType.APPLICATION_COMMAND:
      return handleCommand(env, interaction, ctx);
    case InteractionType.MESSAGE_COMPONENT:
      return handleButton(env, interaction, ctx);
    case InteractionType.MODAL_SUBMIT:
      return handleModal(env, interaction, ctx);
    default:
      console.warn("[index] unknown interaction type:", interaction.type);
      return {
        type: 4,
        data: { content: "\u274C Unsupported interaction type.", flags: 64 }
      };
  }
}
__name(routeInteraction, "routeInteraction");
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
