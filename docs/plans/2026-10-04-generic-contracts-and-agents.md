# Generic contracts and agent access — October 4 clarification

The workbench imports deployed EVM contracts through one ABI pipeline. DAO, NFT, and DeFi are acceptance examples, not application categories, routing modes, separate engines, or separate skills. SaucerSwap was an explicitly approved protocol example in the original plan; its presentation belongs to the other UI agent. No swap/layout changes are part of this slice.

The user's existing implementation authorization covers the following design. A separate generated skill for every contract would duplicate instructions and become stale. Use one portable Agent Skill, with a current catalog and typed command examples produced from the canonical parameter tree. Commands carry the actual tool ID and revision. Argument templates describe structure, not user intent; inspection and required user values still precede execution.

Deliver CLI skill inspection/export, project-scoped Vercel skills install commands, and a read-only HTTP integration for the UI agent. Export Markdown, reference documents, a revision-bound catalog, and argument files together. Preserve existing exports; never silently overwrite user-edited arguments. Test installation with the official skills CLI in an isolated project, rather than guessing agent configuration directories. Local installation is usable before repository publication.

Verify structurally different deployed contracts through core, CLI, MCP, HTTP and assistant tools. Compare real RPC reads and unsigned calldata, overloads, nested values, integer precision, invalid arguments, caller-specific errors, changed revisions and restart persistence. Research public Hedera examples, but distinguish live Hedera reads from isolated fixture deployments. No classification is required to use any of these paths.

The user clarified that voice meant a live spoken conversation, then explicitly removed audio from scope in the latest message. No voice transport, endpoint, microphone capture, or speech dependency is included. Typed chat remains optional and supports Gemini as well as OpenAI/Anthropic, using the same fixed result/plan cards and validated tool backend. Retain explicit model configuration, server-only permanent keys, cancellation, bounded execution and current contract/account context. Configured-provider acceptance is separate from simulated protocol tests.

Exit evidence and any remaining UI integration are recorded in the delivery tracker. No new product categories or source-regeneration framework are introduced.
