import { getAddress, parseAbi } from "viem";
import { hashAbi } from "./abi.js";
import { knownTokenAddress, NETWORKS } from "./networks.js";
import type { ContractRecord, Network } from "./types.js";

export const ROUTER_ABI = parseAbi([
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
  "function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
  "function factory() view returns (address)",
  "function whbar() view returns (address)",
]);
export const TOKEN_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function isAssociated() view returns (bool)",
  "function associate() returns (int64 responseCode)",
]);
export function bundledContracts(): ContractRecord[] {
  return (["testnet", "mainnet"] as Network[]).flatMap((network) => {
    const n = NETWORKS[network];
    return [
      {
        id: `saucerswap-${network}`,
        name: "SaucerSwap V1 router",
        address: getAddress(n.router),
        hederaId: n.routerId,
        kind: "contract" as const,
        abi: ROUTER_ABI,
      },
      {
        id: `sauce-${network}`,
        name: "SAUCE token",
        address: knownTokenAddress(n.sauceId),
        hederaId: n.sauceId,
        kind: "hts-token" as const,
        abi: TOKEN_ABI,
      },
    ].map((record) => ({
      ...record,
      network,
      chainId: n.id,
      abiHash: hashAbi(record.abi),
      revision: hashAbi(record.abi),
      importedAt: "2026-10-03T00:00:00Z",
      provenance: {
        source: "bundled" as const,
        url: "https://docs.saucerswap.finance/developers/contracts",
      },
    }));
  });
}
