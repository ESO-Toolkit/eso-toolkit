/**
 * Handles the "Remove User" button on a ticket embed.
 * Shows a modal to enter the username/ID to remove from the channel.
 */

import {
  ComponentType,
  InteractionResponseType,
  ModalId,
  TextInputStyle,
} from '../types.js';
import type { Env, InteractionResponse } from '../types.js';

export function handleRemoveUserButton(_env: Env): InteractionResponse {
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: `${ModalId.ADD_USER}:remove`, // Reuse add modal with remove flag
      title: 'Remove User from Ticket',
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: 'user_input',
              label: 'User ID or @mention',
              style: TextInputStyle.SHORT,
              placeholder: 'e.g. 123456789012345678 or @username',
              required: true,
              min_length: 1,
              max_length: 100,
            },
          ],
        },
      ],
    },
  };
}
