import type { Abi, AbiFunction, Address, Hex } from "viem";

export type Network = "testnet" | "mainnet";
export type Json =
  | null
  | boolean
  | string
  | number
  | Json[]
  | { [key: string]: Json };
export type Schema = Record<string, any>;
export interface Parameter {
  key: string;
  name: string;
  type: string;
  children?: Parameter[];
  item?: Parameter;
  length?: number;
  schema: Schema;
}
export interface ContractRecord {
  id: string;
  name: string;
  network: Network;
  chainId: number;
  address: Address;
  hederaId?: string;
  kind: "contract" | "hts-token";
  abi: Abi;
  abiHash: Hex;
  revision: string;
  provenance: { source: "bundled" | "supplied" | "sourcify"; url?: string };
  importedAt: string;
}
export interface ToolDefinition {
  schemaVersion: 1;
  id: string;
  contractId: string;
  revision: string;
  name: string;
  signature: string;
  action: "read" | "prepare";
  mutability: AbiFunction["stateMutability"];
  parameters: Parameter[];
  outputs: Parameter[];
  inputSchema: Schema;
  outputSchema: Schema;
  fn: AbiFunction;
}
export interface ToolCatalog {
  tools: ToolDefinition[];
  unsupported: { name: string; reason: string }[];
}
export interface ExecutionResult {
  schemaVersion: 1;
  contractId: string;
  network: Network;
  chainId: number;
  address: Address;
  toolId: string;
  revision: string;
  signature: string;
  value: Json;
  caller?: Address;
  observedAt: string;
  gasEstimate?: string;
  gasEstimateError?: string;
}
export interface TransactionPlan {
  schemaVersion: 1;
  id: string;
  digest: Hex;
  toolId: string;
  contractId: string;
  revision: string;
  network: Network;
  chainId: number;
  from: Address;
  to: Address;
  signature: string;
  args: Record<string, Json>;
  data: Hex;
  valueWeibar: string;
  createdAt: string;
  expiresAt: string;
  simulation: ExecutionResult;
  reviewUrl: string;
}
export interface TransactionRecord {
  hash: Hex;
  network: Network;
  planId?: string;
  submittedAt: string;
}
export interface SwapQuote {
  network: Network;
  chainId: number;
  amountHbar: string;
  amountInTinybar: string;
  amountOutRaw: string;
  amountOutDisplay: string;
  minimumOutRaw: string;
  slippageBps: number;
  quotedAt: string;
  expiresAt: string;
  path: Address[];
  contractId: string;
}
