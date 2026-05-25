# Food Selector Knowledge Base

**Last Updated**: November 14, 2025  
**Focus**: Generated consumable catalog that powers the Loadout Manager food selector

---

## Consumable Catalog Overview

- **Source**: We curate server-side snapshots of the provisioning data published by UESP to keep the list comprehensive and lore-accurate.
- **Refresh cadence**: The catalog is reviewed alongside game updates and large balance passes. If you notice a missing entry, use the “Request Data Refresh” action to flag it for the tooling squad.
- **Data quality**: Each consumable includes its category, item quality, and the originating recipe identifier to help you confirm you are applying the intended buff.

---

## Selector Behaviour

- **Search index**: Type a few letters to reveal matches by name or category (for example, `tea` surfaces every drink tagged as a tea).
- **Metadata chips**: Results highlight the consumable type, category, item quality tier, and recipe reference so you can double-check bonuses before equipping them.
- **Imported loadouts**: Wizard's Wardrobe imports that reference an unknown item appear as a temporary placeholder so you can still view or clear the buff. Once the catalog is refreshed with that item, the selector upgrades the placeholder automatically.
- **Clearing selections**: Use the clear icon inside the selector to remove a consumable. Your loadout export immediately reflects the change.
