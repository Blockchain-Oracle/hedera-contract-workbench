import { defineChain, getAddress, parseUnits, formatUnits } from "viem";
import { assert } from "./errors.js";
import type { Network } from "./types.js";

export const DEFAULTS = {
  rpcConcurrency: 4,
  requestTimeoutMs: 15_000,
  planExpiryMs: 300_000,
  quoteExpiryMs: 30_000,
  swapDeadlineSeconds: 1_200,
  slippageBps: 50,
  maxAbiBytes: 1_048_576,
  maxArrayLength: 1024,
  maxParameterDepth: 16,
  receiptPollMs: 3000,
  receiptPollBudgetMs: 120_000,
  maxChatSteps: 6,
} as const;
export const NETWORKS = {
  testnet: {
    id: 296,
    name: "Hedera testnet",
    rpc: "https://testnet.hashio.io/api",
    mirror: "https://testnet.mirrornode.hedera.com/api/v1",
    explorer: "https://hashscan.io/testnet",
    routerId: "0.0.19264",
    router: "0x0000000000000000000000000000000000004b40",
    whbarId: "0.0.15058",
    sauceId: "0.0.1183558",
  },
  mainnet: {
    id: 295,
    name: "Hedera mainnet",
    rpc: "https://mainnet.hashio.io/api",
    mirror: "https://mainnet-public.mirrornode.hedera.com/api/v1",
    explorer: "https://hashscan.io/mainnet",
    routerId: "0.0.3045981",
    router: "0x00000000000000000000000000000000002e7a5d",
    whbarId: "0.0.1456986",
    sauceId: "0.0.731861",
  },
} as const;
export function networkName(value: unknown): Network {
  assert(
    value === "testnet" || value === "mainnet",
    "INPUT",
    "Choose testnet or mainnet.",
    "network",
  );
  return value;
}
export function chainFor(
  network: Network,
  rpc: string = NETWORKS[network].rpc,
) {
  return defineChain({
    id: NETWORKS[network].id,
    name: NETWORKS[network].name,
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
    blockExplorers: {
      default: { name: "Hashscan", url: NETWORKS[network].explorer },
    },
  });
}
export function knownTokenAddress(id: string) {
  assert(/^0\.0\.\d+$/.test(id), "INPUT", "Expected a native 0.0.x token ID.");
  return getAddress(
    `0x${BigInt(id.split(".")[2]).toString(16).padStart(40, "0")}`,
  );
}
export function parseHbar(value: string): bigint {
  assert(
    typeof value === "string" &&
      value.length <= 88 &&
      /^(0|[1-9]\d*)(\.\d{1,8})?$/.test(value),
    "INPUT",
    "HBAR must be a nonnegative decimal with at most 8 fractional digits.",
    "valueHbar",
  );
  const amount = parseUnits(value, 18);
  assert(
    amount < 1n << 256n,
    "INPUT",
    "HBAR value exceeds the transaction value range.",
    "valueHbar",
  );
  return amount;
}
export function hbarToTinybar(value: string): bigint {
  return parseHbar(value) / 10_000_000_000n;
}
export function tinybarToWeibar(value: bigint): bigint {
  return value * 10_000_000_000n;
}
export function displayHbar(valueWeibar: string): string {
  return formatUnits(BigInt(valueWeibar), 18);
}
