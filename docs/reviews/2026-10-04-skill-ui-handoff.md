# Skill integration for the UI agent

Swap presentation and UI layout remain with the other agent. This slice changes no swap tab, default contract, forms, composer or visual styling. DAO/NFT/DeFi names are acceptance examples only. Do not add category tabs or per-category tool catalogs.

Use `GET /api/workbench/skills?contract=<selectedId>` on the same origin. The envelope's `data` contains portable `markdown`, supporting `references`, selected `contract` identity/revision/provenance, installation commands and current function schemas. Cancel an abandoned fetch and bind the displayed result to the selected ID/revision. Refresh after import/ABI refresh and discard the old result when selection changes.

The human flow is one agent-access section for whichever contract is selected:

- Read/copy the portable SKILL.md. Download via `/api/workbench/skills/markdown?contract=<selectedId>`.
- Copy a displayed local Vercel installation command. The source is an absolute local skill directory. Explain that the command installs into the terminal's current project; the installer chooses compatible agent paths. Codex/Claude Code/Cursor are examples, not a hard compatibility restriction. No Kubernetes or hosted deployment is needed for skills installation.
- Inspect a function's full signature, required fields, input/output schema and decimal-string integers. Display `tool.template` as editable example JSON with its context/revision. If `templateAvailable` is false, show `templateError` and let users construct arguments from the schema.
- Copy `tool.commands.inspect` then the intended read/prepare command. Command `argv` is the machine representation; `shell` is quoted POSIX code. Keep actual argument values in a JSON file, never splice them into shell code. Write commands contain a `WALLET_ADDRESS` placeholder; value zero is an example. No generic argument example grants signing permission.
- Copy the CLI `skills export --contract <actualId> --json` action when a full bundle for another project is wanted. The CLI creates a new ignored directory and returns installer commands for that bundle. Do not advertise a GitHub install until publication.

The original portable skill stays the same across imported contracts. The schema/command context changes deterministically from core, without model generation or executable UI code. Existing wallet review remains the only signing path. Audio is removed from scope; optional chat supports OpenAI/Anthropic/Gemini with a compatible explicit model. These backend capabilities still need to be surfaced in the other agent's UI; no completed UI integration is claimed by this handoff.
