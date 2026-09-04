---
"@openzeppelin/ui-cli": minor
---

Add `oz-ui create init` for installing the `scaffold-dapp` AI skill into a workspace, mirroring the assistant-asset bootstrap that `oz-ui migrate init` provides for the migrate flow. The new subcommand copies `templates/skills/scaffold-dapp/SKILL.md` into the selected agent profile destinations (`.agents/skills/scaffold-dapp`, `.claude/skills/scaffold-dapp`, `.cursor/skills/scaffold-dapp`) and records the selection in `.oz-ui-create.json` for follow-up runs. Like the migrate flow, the JSON envelope (`action: "create-init"`) carries `schemaVersion` and `cli` metadata. Internal: `agent-assets/profiles.ts` was refactored so its `skillDirectoriesForProfiles` and `expectedSkillPathsForProfiles` helpers take a `skillId` argument, letting the same registry serve both `migrate-to-oz-uikit` and `scaffold-dapp` without per-skill duplication.
