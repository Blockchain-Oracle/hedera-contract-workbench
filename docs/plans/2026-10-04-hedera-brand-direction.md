# Approved Hedera visual direction for Contract Workbench

Approved on 2026-10-04: the user instructed “Just continue … Follow your most recommended stuff.” Direction 1 supersedes the Slush palette and geometry. This document records the approved design; verification belongs in the delivery tracker.

## Sources and captured evidence

- [Official Hedera homepage](https://hedera.com/): inspected the actual rendered desktop page.
- [Official Hedera brand book](https://brand.hedera.com/): inspected colors, typography, logo usage, and trademark guidance.
- [Official logo archive](https://hedera.com/wp-content/uploads/2026/05/hedera-logo-library-26.zip): followed the brand book’s download link. Downloaded for reference and extracted the original horizontal and standalone SVG variants.
- Current local landing page and Functions workspace: captured at `http://127.0.0.1:3000/` using the SaucerSwap testnet example. Theme was dark at inspection time.
- The earlier [template comparison](../../../docs/research/2026-10-04-template-landscape/gallery.md) includes the inspected StreamPay page.

Evidence: [Hedera homepage](../../../docs/research/2026-10-04-hedera-brand/hedera-home.jpg), [brand palette](../../../docs/research/2026-10-04-hedera-brand/hedera-colors.jpg), [current landing](../../../docs/research/2026-10-04-hedera-brand/workbench-home-before.jpg), [current functions](../../../docs/research/2026-10-04-hedera-brand/workbench-functions-before.jpg).

Archive SHA-256: `8265710243681c68d4e7e5bd5b41ef138d281b8f046bfe74f6f53e5f8b032ba8`.

## Official brand facts

| Role | Color |
| --- | --- |
| Primary black | `#000000` |
| Primary white | `#FFFFFF` |
| Charcoal | `#11151D` |
| Ultraviolet | `#8259EF` |
| Azure | `#0031FF` |

The primary gradient runs from Ultraviolet to Azure. Hedera uses licensed Styrene A; its guide names Montserrat as a replacement for presentation/document use.

Use the supplied black/white logo intact, respecting clear space. Its network identity belongs in a separate “Built on Hedera” area; Contract Workbench retains its own product name and identity. The guide prohibits incorporating the Hedera mark into a third-party product logo or app icon and requires attribution that the offering is independent. The currency symbol is distinct from the logo.

## What the actual pages teach us

| Observation | Workbench implication |
| --- | --- |
| Hedera’s homepage uses a black foundation, large light typography, a clear primary action, and a limited violet/blue illustration. | Increase contrast and simplify hierarchy; use the brand accent selectively. |
| StreamPay communicates its core job immediately and offers direct actions for its two audiences. | Put the contract workflow and a useful first action at the front of our landing page. |
| Workbench’s dark landing uses blue across the whole canvas, mint actions, and a large assistant panel. | The current visual hierarchy gives chat more weight than the typed execution engine. |
| Workbench’s workspace layers several blue surfaces and heavily rounded panels. | Make context, function selection, arguments, and results easier to distinguish through alignment, dividers, and surface contrast. |
| The current `WorkbenchMark` is an H-shaped SVG drawn in application code. | It is not the official asset; replace that ambiguity with a clear product wordmark and a separate authentic network lockup. |

These are visual observations, not claims that a competitor’s complete product has been verified.

## Three viable directions

1. **Black landing, focused workspace — recommended.** A black editorial landing with a restrained violet/azure detail; a neutral white working surface with a charcoal dark alternative. Strong public identity and readable forms. Both surfaces share typography, controls, spacing, and the same violet selection accent.
2. **Charcoal throughout.** A continuous dark technical environment with thin rules and violet selection. Consistent atmosphere, but dense nested arguments and long results need especially careful surface separation.
3. **White editorial throughout.** White canvas, black type, sparse violet/azure features. The smallest visual disruption and clearest reading surface, but less visual impact in the opening screen.

## Recommended concrete layout

### Landing

- Product wordmark at the left of a simple header; agent setup, theme, and Open Workbench at the right. Authentic “Built on Hedera” network identity appears separately with generous clear space.
- Large headline: “Your contract. Every interface.” Supporting copy explains importing a deployed contract and obtaining typed functions in browser, CLI, and agent.
- Primary action: “Import contract.” Secondary action: “Try the testnet example.” First-run reads remain available without a wallet or model key.
- Opposite the headline, a real contract preview shows selected network/address, discovered function signatures, and a typed argument/result area. It uses actual catalog data; there are no invented results, metrics, or testimonials.
- A short walkthrough connects import → inspect → call → wallet review. Browser, CLI, MCP, and skill are shown as interfaces to that workflow.
- Keep usable chat on the landing, as previously requested, in a clearly labeled “Ask about this contract” section below the first screen. Missing provider configuration has an informative disabled state.
- A small final setup area offers copyable startup and portable agent commands.

### Workbench

- A neutral navigation rail, a clear selected-contract switcher, and persistent network context. Use official network identity here without turning it into the product mark.
- Keep one main function workspace: compact searchable function list, prominent full function identity, typed arguments, primary execution action, then structured results. The active row has a violet indicator and a restrained tint.
- Reduce nested rounded boxes. Use consistent alignment, separators, and approximately 10–12px control radii; reserve more expressive shapes for the landing.
- Required errors remain directly attached to fields. Known argument suggestions keep provenance; no guessed token IDs, DAO categories, or automatic contract grouping.
- Agent setup uses the existing authentic agent assets, copy commands, skill Markdown, and MCP configuration in the same visual system.
- Wallet review remains an explicit drawer with the exact account, network, calldata, value, and simulation. Status colors communicate meaning separately from brand color.
- The interface remains generic for the imported ABI. A swap function appears only when present in that contract’s catalog.

### Palette and typography application

- White/black/charcoal form the structural surfaces. Azure is suitable for compact white-text actions; Ultraviolet is suitable for restrained highlights and larger brand actions.
- Measured solid-color contrast: white on Azure is 7.28:1; white on Ultraviolet is 4.54:1. Treat Ultraviolet as close to the normal-text threshold and do not lower button/text opacity. Gradient text/buttons require checking their weakest contrast point.
- Keep locally bundled, licensed Geist for application text and Geist Mono for signatures, addresses, and commands. Create distinction through scale and weight rather than introducing an unlicensed font.
- Support the existing light/dark preference, keyboard focus, and reduced motion. On narrow screens, headline, contract preview, and primary action stack without horizontal clipping; workspace navigation becomes a drawer.

## Approval and subsequent implementation

User approval is recorded above. Implementation: update the durable design context, implement through existing shadcn primitives, inspect rendered desktop and narrow layouts, and run lint/typecheck/build plus relevant regression checks. Brand changes must preserve the CLI, MCP, skills, deterministic reads, optional assistant, and exact wallet review behavior.
