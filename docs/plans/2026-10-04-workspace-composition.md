# Workspace composition revision

The user rejected the October 4 rendered design after authorizing continued implementation using the recommended direction. Retain the agreed Hedera brand assets and light/dark foundations. Rework the composition within that existing scope; do not repeat a palette-only change or claim user acceptance of the revised appearance.

## Observed problem

At 1280×720 the floating navigation rail, repeated page heading and 168px contract card consume much of the available screen. A simple NFT owner lookup places its execution action below the initial viewport. Function selection and the operation are visually disconnected. Zero-result state previously gives no indication of the ABI return shape.

## Revision

- Compact full-width product header with explicit network, theme and one wallet control.
- Underline navigation for Functions, Assistant, Agent access and Activity. Keep the existing mobile drawer.
- A contract toolbar with a visibly bordered picker, address copy, provenance and local registry actions.
- One continuous workspace with a 256px searchable function navigator instead of another nested rounded card.
- Full-signature heading and brief network/approval context; remove duplicated descriptions.
- Arguments and response side by side on wide screens. Before execution, show actual ABI return types and a truthful empty state. Preserve existing validated calls and shared result cards.
- Stack the form and result on narrow screens. Keep overload selection, error focus, keyboard navigation, exact review and unsigned preparations.

Reuse the installed shadcn/Radix controls. The 21st search returned an API Request Inspector and dashboard/sidebar references; no third-party source or dependencies are added. The existing product primitives already cover the required interactions.

Verification belongs in the delivery record. No core execution, CLI, MCP, provider or registry changes are part of this revision.
