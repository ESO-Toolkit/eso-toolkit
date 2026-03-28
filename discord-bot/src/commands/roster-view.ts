/**
 * /roster view <id> — Post a roster as formatted Discord text messages.
 *
 * Fetches the roster from the Roster Hub API's /discord endpoint,
 * which returns pre-formatted Discord-markdown sections, then sends
 * each section as a sequential message in the channel.
 */

import { sendFollowup } from '../discord.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

interface DiscordFormatResponse {
  title: string;
  sections: string[];
  error?: string;
}

export async function handleRosterView(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const rawId = interaction.data?.options?.[0]?.value;
  if (!rawId || typeof rawId !== 'string') {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please provide a roster ID. You can find it in the roster URL: `esotk.com/rosters/<id>`',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  // Extract ID from URL if user pasted a full link
  const id = rawId.includes('/rosters/')
    ? rawId.split('/rosters/').pop()!.split(/[?#]/)[0]
    : rawId.trim();

  // Defer so we can send multiple follow-up messages
  ctx.waitUntil(postRosterMessages(env, interaction.token, id));

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {},
  };
}

async function postRosterMessages(
  env: Env,
  interactionToken: string,
  rosterId: string,
): Promise<void> {
  try {
    const res = await fetch(`${env.ROSTER_HUB_API_URL}/rosters/${rosterId}/discord`, {
      headers: { 'User-Agent': 'ESO-Toolkit-DiscordBot/1.0' },
    });

    if (!res.ok) {
      const status = res.status;
      const msg = status === 404
        ? '❌ Roster not found. Check the ID and try again.'
        : `❌ Failed to fetch roster (HTTP ${status}).`;
      await sendFollowup(env, interactionToken, { content: msg });
      return;
    }

    const data = (await res.json()) as DiscordFormatResponse;

    if (!data.sections?.length) {
      await sendFollowup(env, interactionToken, {
        content: '❌ Roster data could not be decoded.',
      });
      return;
    }

    // Send each section as a separate message for clean formatting
    for (let i = 0; i < data.sections.length; i++) {
      await sendFollowup(env, interactionToken, {
        content: data.sections[i],
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await sendFollowup(env, interactionToken, {
      content: `❌ Error fetching roster: ${message}`,
    });
  }
}
