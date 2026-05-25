/**
 * Handles panel button clicks (Bug / Feature / Feedback).
 * Responds with a modal to collect ticket details from the user.
 */

import {
  ButtonId,
  ComponentType,
  InteractionResponseType,
  ModalId,
  TextInputStyle,
} from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse, TicketCategory } from '../types.js';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  [ButtonId.CREATE_BUG]: { label: 'Bug Report', emoji: '🐛' },
  [ButtonId.CREATE_FEATURE]: { label: 'Feature Request', emoji: '💡' },
  [ButtonId.CREATE_FEEDBACK]: { label: 'General Feedback', emoji: '💬' },
};

const BUTTON_TO_CATEGORY: Record<string, TicketCategory> = {
  [ButtonId.CREATE_BUG]: 'Bug',
  [ButtonId.CREATE_FEATURE]: 'Feature',
  [ButtonId.CREATE_FEEDBACK]: 'Feedback',
};

export function handleCreateTicketButton(
  _env: Env,
  interaction: DiscordInteraction,
): InteractionResponse {
  const customId = interaction.data?.custom_id ?? '';
  const meta = CATEGORY_LABELS[customId] ?? { label: 'Support', emoji: '🎫' };
  const category = BUTTON_TO_CATEGORY[customId] ?? 'Feedback';

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
              custom_id: 'ticket_title',
              label: 'Short title (summarise your request)',
              style: TextInputStyle.SHORT,
              min_length: 5,
              max_length: 100,
              required: true,
              placeholder: 'e.g. Parser crashes on large log files',
            },
          ],
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: 'ticket_description',
              label: 'Describe the issue in detail',
              style: TextInputStyle.PARAGRAPH,
              min_length: 20,
              max_length: 2000,
              required: true,
              placeholder:
                'Include steps to reproduce, expected vs actual behaviour, screenshots, log IDs, etc.',
            },
          ],
        },
      ],
    },
  };
}
