# Test Share URL with Selected Actor

## Changes Made

1. **Share URL Generation**: Fixed to include hash routing and `/replay` slug
   - Old format: `/report/${reportId}/fight/${fightId}`
   - New format: `/#/report/${reportId}/fight/${fightId}/replay`

2. **Camera Initialization**: Modified to prioritize selected actor from URL
   - Priority order: Selected Actor → Boss → First Enemy → First Actor → Center
   - When an actor is selected via URL parameter (`?actorId=123`), camera will focus on that actor

3. **URL Parameters**: Already included selected actor in share functionality
   - `actorId`: The ID of the selected actor
   - `time`: The current timestamp

## Testing Steps

1. Navigate to a fight replay page
2. Select an actor by clicking on their card
3. Move the timeline to a specific time
4. Click the Share button (📤 icon)
5. The generated URL should:
   - Include the hash (`#`) 
   - Include `/replay` at the end
   - Include `?actorId=XXX&time=YYY` parameters

6. Open the shared URL in a new tab/window
7. Verify:
   - The actor is pre-selected
   - The camera focuses on the selected actor instead of the boss
   - The timeline is set to the correct time

## Expected URL Format

```
https://example.com/#/report/12345/fight/67890/replay?actorId=123456&time=1234567890
```
