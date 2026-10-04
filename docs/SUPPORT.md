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

The router's token address getter is `whbar()`, verified against [the official router source](https://github.com/saucerswaplabs/saucerswap-periphery/blob/606a00316c5526a8fb42c35a5692d8f8bdb97810/contracts/UniswapV2Router02.sol#L18) and live RPC on both networks. The earlier bundled `WETH()` signature was incorrect and is removed; ABI revisions change accordingly. `WHBAR()` in that source denotes the wrapper contract, a different address from the token used in the path. Getter assistance does not add wrapping or allowance operations.

| Example                         | Testnet ID  | Mainnet ID  |
| ------------------------------- | ----------- | ----------- |
| SaucerSwap V1 router            | 0.0.19264   | 0.0.3045981 |
| WHBAR token used in router path | 0.0.15058   | 0.0.1456986 |
| SAUCE token facade              | 0.0.1183558 | 0.0.731861  |

Deployment authority: [SaucerSwap contracts](https://docs.saucerswap.finance/developers/contracts). Native token facades use canonical long-zero token addresses; arbitrary contract IDs resolve through the corresponding network's mirror contract metadata and its actual evm_address. Contract addresses are never derived by blindly padding contract IDs.

Association uses caller-scoped `isAssociated()` / `associate()` from [HRC-719](https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-719.md). Successful association simulation returns Hedera response code 22, then the wallet submits and association is verified before a swap. Router native-HBAR calls use 18-decimal RPC value while getAmountsOut path input is WHBAR's 8-decimal tinybar quantity. SAUCE outputs use 6 decimals. [Hedera units](https://docs.hedera.com/evm/differences/hbar-decimals).

Automatic ABI discovery uses [Sourcify](https://docs.sourcify.dev/docs/api/). Supplied interfaces are marked supplied and retain a hash/revision. A verified ABI is useful provenance, not proof of contract safety or semantic correctness. Proxies require the appropriate implementation ABI supplied/verified at the address; automatic proxy tracing is not advertised.

Interface/output parity and live workflow evidence are recorded in DELIVERY.md. Do not treat implemented source as evidence of a completed on-chain transaction.

## Broader contract acceptance

The same dispatcher imports every supported ABI; it does not classify contracts as tokens, NFTs, DAOs or DeFi. A supplied ABI must describe the deployed address correctly. Contract permissions, funding, association, proxy implementation and protocol semantics remain real prerequisites; ABI import cannot invent them.

`npm run verify:generic` deploys three original verification fixtures on an isolated EVM and compares typed results, nested proposal preparation, NFT overload calldata, wrong-caller reverts, integer bounds and payable value across the actual adapters. These fixtures are test source under `packages/hardhat/test/fixtures`, not new application categories or production standard implementations. Independent ethers encoding checks unsigned calldata. The optional provider adapters are tested with controlled HTTP responses and actual core RPC reads; paid inference is not claimed.

`npm run verify:generic-network` imports a current testnet NFT facade with the authored [ERC-721 interface subset](examples/erc721-read.abi.json) and validates name, symbol, total supply and owner reads across direct RPC, core, CLI, MCP and assistant tools. The network fixture may age or disappear; it is not a permanent bundled default or proof of full ERC-721/HTS compliance. See [live evidence](evidence/generic-network.json).

The primary [Hedera DAO accelerator source](https://github.com/hashgraph/hedera-accelerator-defi-dex/tree/d813159078be7d84b4c408b153a585348f0f82c2) contains governance, DAO metadata tuples, factories and ERC-721 interfaces. Its 2023 published deployment addresses did not return the expected DAO functions on the current testnet during this check. The evidence records those limitations; local governance fixture verification is not advertised as a successful live Hedera DAO workflow.

The portable skill's installation is independently exercised using the official [Vercel skills CLI](https://github.com/vercel-labs/skills/blob/main/README.md) in an isolated project for Codex, Claude Code and Cursor. Other supported agent IDs are forwarded to that installer; no universal host compatibility is assumed. No contract-specific skill rewrite is required.
