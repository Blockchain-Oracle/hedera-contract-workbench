import { strict as assert } from "node:assert";
import { ethers } from "hardhat";
describe("Observation", () => {
  it("keeps tuples caller-scoped and exposes independent overloads", async () => {
    const [alice, bob] = await ethers.getSigners();
    const contract = await (
      await ethers.getContractFactory("Observation")
    ).deploy();
    await contract.waitForDeployment();
    await (await contract.record(["weather", -12n, [1n, 2n]])).wait();
    const result = await contract.latest();
    assert.equal(result.label, "weather");
    assert.equal(result.value, -12n);
    assert.deepEqual([...result.readings], [1n, 2n]);
    await assert.rejects(
      contract.connect(bob).getFunction("latest")(),
      /NoSample/,
    );
    await assert.rejects(
      contract.connect(alice).getFunction("record")(["", 0n, []]),
      /EmptyLabel/,
    );
    assert.equal(await contract.getFunction("describe(uint256)")(42n), 42n);
    assert.equal(
      await contract.getFunction("describe(string)")("hello"),
      "hello",
    );
  });
});
