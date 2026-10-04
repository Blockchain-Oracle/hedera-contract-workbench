# Workbench interface refinement

Authority: the user approved the Slush blue palette and requested a complete interface refinement, a connected landing page, custom pickers, recognizable agent identities, and removal of the global Swap and transaction-file upload. The latest instruction removes Read/Write pills and replaces the weak function search and controls. Read and wallet-approved transaction capabilities remain required by the implementation plan.

## Direction

Considered a chat-only entry, a long marketing page, and a compact product home with a real assistant and links to the workspace. Choose the compact home: it explains the reusable template, makes deterministic functionality easy to reach, and shows the assistant's actual configured/disabled state. Preserve blue/green tokens, local fonts, responsive navigation, and the ABI-driven catalog. Use open sections and light dividers rather than nesting cards.

21st searches informed assistant/composer and combobox references. Existing Radix/shadcn primitives support the actual product; no third-party candidate code with unresolved licensing is copied. Add cmdk for searchable, keyboard-operated pickers rather than implementing listbox behavior manually. Agent marks are licensed static assets with source attribution.

## Implementation

1. Add shared searchable picker and provider setup dialog; refine field/action geometry.
2. Add product home at `/`, workspace at `/workbench`, and preserve old transaction review links.
3. Remove Swap navigation, automatic swap selection, and plan-file upload. Keep all interfaces on the same core dispatcher.
4. Refine contract selection, function search/list, forms, assistant, wallet choices, and portable agent tools. No DAO/NFT categories or hardcoded transaction workflows.
5. Verify desktop/narrow layouts, keyboard menus, empty/disabled states, a useful live read, dynamic agent commands, and CLI/MCP review routing. Run lint, types, focused tests and production build.
6. Record evidence and unresolved paid-provider/real-wallet acceptance limits, then commit locally. Publication is separate.
