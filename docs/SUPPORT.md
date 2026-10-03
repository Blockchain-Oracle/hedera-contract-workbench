# Supported interfaces and ABI provenance

| Capability                             | Testnet  | Mainnet  |
| -------------------------------------- | -------- | -------- |
| Generic supported EVM reads            | Yes      | Yes      |
| Caller-specific simulation             | Yes      | Yes      |
| Unsigned preparation                   | Yes      | Yes      |
| Browser EVM-wallet approval/submission | Yes      | Yes      |
| CLI/MCP/chat signing                   | No       | No       |
| Native ED25519 wallet                  | Deferred | Deferred |

Supported ABI values: bounded uint/int (8–256 bits), address, bool, string, bytes/bytes1–32, fixed/dynamic arrays and nested tuples. Decimal JSON integers preserve precision. Empty or duplicate labels receive positional keys. Unsupported functions are listed with a reason. Fallback/receive/events are not function tools; indexing and source deployment are outside first-release scope.

Bundled ABI subsets are authored from public interface signatures, not copied application source. They expose the router methods used by this workbench and selected HTS token facade/ERC views; they are intentionally narrower than the complete contracts.

| Example                         | Testnet ID  | Mainnet ID  |
| ------------------------------- | ----------- | ----------- |
| SaucerSwap V1 router            | 0.0.19264   | 0.0.3045981 |
| WHBAR token used in router path | 0.0.15058   | 0.0.1456986 |
| SAUCE token facade              | 0.0.1183558 | 0.0.731861  |

Deployment authority: [SaucerSwap contracts](https://docs.saucerswap.finance/developers/contracts). Native token facades use canonical long-zero token addresses; arbitrary contract IDs resolve through the corresponding network's mirror contract metadata and its actual evm_address. Contract addresses are never derived by blindly padding contract IDs.

Association uses caller-scoped `isAssociated()` / `associate()` from [HRC-719](https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-719.md). Successful association simulation returns Hedera response code 22, then the wallet submits and association is verified before a swap. Router native-HBAR calls use 18-decimal RPC value while getAmountsOut path input is WHBAR's 8-decimal tinybar quantity. SAUCE outputs use 6 decimals. [Hedera units](https://docs.hedera.com/evm/differences/hbar-decimals).

Automatic ABI discovery uses [Sourcify](https://docs.sourcify.dev/docs/api/). Supplied interfaces are marked supplied and retain a hash/revision. A verified ABI is useful provenance, not proof of contract safety or semantic correctness. Proxies require the appropriate implementation ABI supplied/verified at the address; automatic proxy tracing is not advertised.

Interface/output parity and live workflow evidence are recorded in DELIVERY.md. Do not treat implemented source as evidence of a completed on-chain transaction.
