import { subtask, type HardhatUserConfig } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-ethers";
import { createRequire } from "node:module";
const localRequire = createRequire(__filename);
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async ({ solcVersion }, _hre, next) => {
    if (solcVersion !== "0.8.30") return next();
    return {
      compilerPath: localRequire.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: solcVersion,
      longVersion: localRequire("solc").version(),
    };
  },
);
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: { evmVersion: "paris", optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 296 },
    testnet: {
      url:
        process.env.WORKBENCH_RPC_TESTNET_URL ||
        "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.MAINTAINER_DEPLOY_KEY
        ? [process.env.MAINTAINER_DEPLOY_KEY]
        : [],
    },
  },
};
export default config;
