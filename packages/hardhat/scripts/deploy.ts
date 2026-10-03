import { ethers, network } from "hardhat";
async function main() {
  if (network.name !== "testnet" || !process.env.MAINTAINER_DEPLOY_KEY)
    throw new Error(
      "Optional deployment requires testnet and an explicitly configured maintainer key.",
    );
  const contract = await (
    await ethers.getContractFactory("Observation")
  ).deploy();
  await contract.waitForDeployment();
  console.log(
    JSON.stringify({
      network: "testnet",
      address: await contract.getAddress(),
      hash: contract.deploymentTransaction()?.hash,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
