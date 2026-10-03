import type { TransactionRecord } from "@sh/core";
export function recoveryRecords(): TransactionRecord[] {
  try {
    const records = JSON.parse(
      localStorage.getItem("workbench-transactions") || "[]",
    );
    return Array.isArray(records)
      ? records
          .filter(
            (r) =>
              /^0x[0-9a-fA-F]{64}$/.test(r?.hash) &&
              ["testnet", "mainnet"].includes(r?.network),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function saveRecovery(record: TransactionRecord) {
  localStorage.setItem(
    "workbench-transactions",
    JSON.stringify(
      [
        record,
        ...recoveryRecords().filter(
          (r) => !(r.hash === record.hash && r.network === record.network),
        ),
      ].slice(0, 50),
    ),
  );
}
