# Feature Documentation

Feature-specific documentation for the ESO Log Aggregator.

---

## Feature Directories

| Feature | Directory | Description |
|---------|-----------|-------------|
| Scribing Detection | [scribing/](./scribing/) | ESO scribing ability detection and signature scripts |
| Grimoire & Affixes | [grimoire/](./grimoire/) | Grimoire filtering and affix detection |
| 3D Markers | [markers/](./markers/) | M0R markers on 3D arena replay |
| Buff Uptimes | [buff-uptimes/](./buff-uptimes/) | Buff uptime tracking and visualization |
| Calculations | [calculations/](./calculations/) | Worker-based calculation formulas |
| Logger | [logger/](./logger/) | Centralized logging system |
| Performance | [performance/](./performance/) | Performance monitoring |
| Roster Builder | [roster-builder/](./roster-builder/) | Group composition building |
| Loadout Manager | [loadout-manager/](./loadout-manager/) | Character loadout management |
| Add-ons | [addons/](./addons/) | External data integrations (Wizard's Wardrobe) |

## Standalone Documents

| Document | Description |
|----------|-------------|
| [Replay System Evaluation](./REPLAY_SYSTEM_ARCHITECTURE_EVALUATION.md) | Architecture evaluation of the fight replay system |
| [Loadout Manager Status](./LOADOUT_MANAGER_STATUS.md) | Phase status and remaining work |
| [Set Management](./SET_MANAGEMENT_SUMMARY.md) | Roster Builder set management |
| [Dynamic Camera Controls](./DYNAMIC_CAMERA_CONTROLS.md) | Camera zoom/target algorithms |
| [URL Param Sync](./URL_PARAM_SYNC.md) | Redux URL parameter synchronization |
| [Analytics Path Normalization](./analytics-path-normalization.md) | GA4 dynamic path handling |
| [Cookie Consent](./cookie-consent.md) | GDPR compliance implementation |
| [Slot Inference](./SLOT_INFERENCE_SOLUTION.md) | Item slot inference and confidence model |

## Key Insight: Scribing Detection

Always check **ALL event types** (cast, damage, healing, buff, debuff, **resource**) when searching for signature scripts. Some scripts (like Anchorite's Potency) appear only as resource events.

See: [AI Scribing Detection Instructions](../ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)
