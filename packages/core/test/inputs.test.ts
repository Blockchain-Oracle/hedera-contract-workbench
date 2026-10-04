import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAbi } from "viem";
import {
  parameterTree,
  toolsFor,
  bundledContracts,
  asError,
  errorEnvelope,
} from "../src/index.js";
import { argumentIssues, validateArguments } from "../src/validation.js";
import { inputSources, resultChoices, gettersFor } from "../src/inputs.js";

test("all missing and invalid fields use canonical nested paths before execution", () => {
  const p = parameterTree([
    { type: "uint256", name: "amount" },
    { type: "address[]", name: "path" },
    {
      type: "tuple",
      name: "proposal",
      components: [
        { type: "uint8", name: "vote" },
        { type: "address", name: "target" },
      ],
    },
  ]);
  const bad = {
    amount: "",
    path: null,
    proposal: { vote: "256", target: "bad-address" },
  };
  const issues = argumentIssues(p, bad);
  assert.deepEqual(
    issues.map((i) => i.path),
    [
      "arguments.amount",
      "arguments.path",
      "arguments.proposal.vote",
      "arguments.proposal.target",
    ],
  );
  assert.match(issues[0].message, /required/);
  assert.match(issues[1].message, /required/);
  assert.throws(
    () => validateArguments(p, bad),
    (error: any) =>
      error.path === issues[0].path && error.message === issues[0].message,
  );
  const valid = {
    amount: "9007199254740993",
    path: [],
    proposal: { vote: "0", target: `0x${"1".repeat(40)}` },
  };
  assert.deepEqual(argumentIssues(p, valid), []);
  assert.equal(validateArguments(p, valid)[0], 9007199254740993n);
  assert.deepEqual(
    argumentIssues(p, { ...valid, path: ["invalid"] }).map((i) => i.path),
    ["arguments.path[0]"],
  );
  assert.deepEqual(argumentIssues(p, { ...valid, path: [null] }), [
    { path: "arguments.path[0]", message: "path[0] is required." },
  ]);
  assert.deepEqual(argumentIssues(p, { ...valid, proposal: null }), [
    { path: "arguments.proposal", message: "proposal is required." },
  ]);
});

test("explicit empty strings/arrays/bytes and false/zero remain valid ABI values", () => {
  const p = parameterTree([
    { type: "string", name: "text" },
    { type: "bytes", name: "data" },
    { type: "bool", name: "enabled" },
    { type: "uint8[]", name: "ids" },
  ]);
  const valid = { text: "", data: "0x", enabled: false, ids: ["0"] };
  assert.deepEqual(argumentIssues(p, valid), []);
  assert.deepEqual(validateArguments(p, { ...valid, ids: [] }), [
    "",
    "0x",
    false,
    [],
  ]);
  assert.equal(
    argumentIssues(p, { ...valid, text: null })[0].path,
    "arguments.text",
  );
});

test("getter discovery stays read-only, ABI-scoped, revision-bound and non-semantic", () => {
  const base = bundledContracts()[0];
  const catalog = toolsFor({
    ...base,
    revision: "input-fixture",
    abi: parseAbi([
      "function proposalIds() view returns(uint256[])",
      "function proposalCount() view returns(uint256)",
      "function vote(uint256 proposalId)",
      "function setValue(uint256 value) returns(uint256)",
    ]),
  }).tools;
  const vote = catalog.find((t) => t.name === "vote")!;
  const sources = inputSources(vote, catalog);
  assert.deepEqual(
    sources.sources[0].getters.map((g) => g.signature),
    ["proposalIds()", "proposalCount()"],
  );
  assert.ok(
    sources.sources[0].getters.every((g) => g.revision === "input-fixture"),
  );
  assert.match(sources.guidance, /count is not an enumeration/);
  assert.ok(
    !gettersFor(vote.parameters[0], catalog).some(
      (t) => t.action === "prepare",
    ),
  );
});

test("actual getter choices preserve precise array/tuple paths and enforce destination bounds", () => {
  const target = parameterTree([{ type: "uint8", name: "vote" }])[0];
  const outputs = parameterTree([
    {
      type: "tuple[]",
      name: "records",
      components: [
        { type: "uint256", name: "id" },
        { type: "address", name: "owner" },
      ],
    },
  ]);
  const choices = resultChoices(target, outputs, [
    { id: "255", owner: `0x${"1".repeat(40)}` },
    { id: "256", owner: `0x${"2".repeat(40)}` },
  ]);
  assert.deepEqual(choices.values, [
    { path: "result[0].id", type: "uint256", value: "255" },
  ]);
  const wide = parameterTree([{ type: "uint256", name: "id" }])[0];
  assert.equal(
    resultChoices(wide, outputs, [
      { id: "9007199254740993", owner: `0x${"1".repeat(40)}` },
    ]).values[0].value,
    "9007199254740993",
  );
  const many = resultChoices(
    wide,
    parameterTree([{ type: "uint256[]", name: "ids" }]),
    Array.from({ length: 80 }, (_, i) => String(i)),
  );
  assert.equal(many.values.length, 64);
  assert.equal(many.truncated, true);
});

test("known application errors survive persistent-runtime module identity changes", () => {
  const foreign = Object.assign(
    new Error(
      "The sender account does not exist on the selected Hedera network.",
    ),
    {
      name: "WorkbenchError",
      code: "PRECONDITION",
      path: "from",
      retryable: false,
      nextAction: "Omit caller for ordinary reads.",
    },
  );
  const error = asError(foreign);
  assert.equal(error.code, "PRECONDITION");
  assert.equal(errorEnvelope(foreign).error.retryable, false);
  assert.equal(error.nextAction, foreign.nextAction);
  assert.equal(
    asError(
      new Error(
        "The sender account does not exist on the selected Hedera network.",
      ),
    ).code,
    "PRECONDITION",
  );
});
