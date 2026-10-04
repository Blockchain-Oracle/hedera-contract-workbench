# Live OpenAI assistant acceptance

The user supplied an OpenAI key specifically for real assistant testing. It is saved only in the ignored local `packages/nextjs/.env.local`, with permissions `0600`. The assistant is configured for `openai` and `gpt-4.1-mini`. No credential value, authorization header or secret-bearing request is included in evidence.

## Actual inference

In an isolated browser conversation, the selected imported Night Market NFT returned `name() = Night Market` and `symbol() = NIGHT` as real result cards. Both values agree with separate direct core reads. The next turn asked for a missing token ID. An explicitly supplied diagnostic ID `99999999999999999999` produced the actual `INVALID_TOKEN_NFT_SERIAL_NUMBER` revert, which appeared as a contract-error card and an accurate assistant explanation.

Changing selection to the SaucerSwap testnet router reset the conversation and used its different function catalog. Live `factory()` and `whbar()` results agree with independent core reads. These are read checks; no swap was requested or submitted.

The [production HTTP evidence](../evidence/live-assistant/production-read.json) records another actual OpenAI inference through the final built chat route, with a connected address supplied in the request context. The tool omitted that address for the ordinary factory read; the successful result has no caller. This checks the assistant request path without claiming an actual browser-wallet session.

## Failures discovered and repaired

1. **Cancellation poisoned the next turn.** Stop interrupted a live reply and restored the composer, but its follow-up failed. A sanitized reproduction captured the provider's actual HTTP 404: the interrupted message item did not exist. The installed Responses adapter was replaying stored provider item references. Chat now sets OpenAI `store: false` and sends the conversation content. This follows the [official manual conversation-state approach](https://developers.openai.com/api/docs/guides/conversation-state). Conversation conversion also drops incomplete tool calls while retaining completed calls/results. The previously broken browser conversation then completed a live read. A second Stop before output followed by a live `whbar()` read also succeeded.
2. **Empty argument wrappers caused unnecessary read errors.** The model initially called two zero-argument getters with `{}` rather than `{ arguments: {} }`. Core validation rejected them and the model retried successfully. The assistant schema now permits omission only when the canonical ABI declares zero inputs; the adapter supplies the unambiguous empty object. Null, unknown ABI fields and omitted arguments for functions with inputs remain invalid. This does not synthesize token IDs, recipients, amounts or other required values.

## Verification and limits

Lint, Next.js typecheck, all runtime package builds, focused assistant tests and the final production build pass. `npm run verify:assistant-replay` exercises the actual chat route with the installed OpenAI adapter against controlled HTTP fixtures: interrupted text with unavailable item IDs, an unfinished tool call, retained completed tool results, and a safe provider error. It incurs no inference charges. `verify:assistant` retains its separate mock-model/live-RPC scope and now checks the zero-argument bridge plus invalid argument rejection.

The final build used closed loopback RPC endpoints and empty provider keys/model while the ignored credential file was present. A scan of 888 build files found zero copies of the supplied key; all eight trace manifests exclude environment files and local workbench state. Two pre-existing skill-export tracing warnings remain. [Build log](../evidence/live-assistant/build.txt) · [Full check record](../evidence/live-assistant/checks.json) · [Live browser follow-up stream](../evidence/live-assistant/browser-after-stop.json) · [Rendered result after Stop](../evidence/live-assistant/after-stop-read.png).

Live acceptance covers OpenAI `gpt-4.1-mini`. Anthropic/Gemini inference, reasoning-model interruption, chat-to-wallet review and funded transaction acceptance remain open. Provider-failure regression used controlled HTTP, not an induced outage or invalidation of the supplied account. No usage/cost/performance estimate is claimed. No signing, funding, push, publication or submission occurred. Temporary testing surfaces are closed after acceptance; the primary development preview and its user conversation remain available.
