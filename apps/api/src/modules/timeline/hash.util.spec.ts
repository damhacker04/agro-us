import { describe, expect, it } from "vitest";
import { canonicalize, computeNodeHash, computeRootHash, sha256, type NodeHashInput } from "./hash.util";

const node: NodeHashInput = {
  batchId: "batch-1", seq: 1, activityType: "PENANAMAN", description: "Tanam cabai",
  lng: 112.123456789, lat: -7.123456789, deviceTs: new Date("2026-09-01T03:00:00Z"),
  photoHashes: ["a".repeat(64), "b".repeat(64)], ralatOfId: null,
};

describe("Verified Timeline cryptographic contract", () => {
  it("freezes canonical field order, coordinate precision and UTC serialization", () => {
    expect(canonicalize(node)).toBe(`batch-1|1|PENANAMAN|Tanam cabai|112.1234568|-7.1234568|2026-09-01T03:00:00.000Z|${node.photoHashes.join(",")}|`);
    expect(canonicalize({ ...node, ralatOfId: "old-node" })).toMatch(/\|old-node$/);
  });
  it("matches the published SHA-256 known vector for strings and bytes", () => {
    const expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(sha256("abc")).toBe(expected);
    expect(sha256(Buffer.from("abc"))).toBe(expected);
  });
  it("binds every evidence field and preceding hash into the node", () => {
    const original = computeNodeHash(node, null);
    for (const altered of [
      { ...node, description: "Ralat" }, { ...node, seq: 2 },
      { ...node, photoHashes: [...node.photoHashes].reverse() },
      { ...node, lng: 113 }, { ...node, ralatOfId: "previous" },
    ]) expect(computeNodeHash(altered, null)).not.toBe(original);
    expect(computeNodeHash(node, original)).not.toBe(original);
    expect(computeNodeHash({ ...node, lng: 112.123456790 }, null)).toBe(original);
  });
  it("binds root hash to the complete ordered chain, including the empty-chain vector", () => {
    expect(computeRootHash([])).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const a = computeNodeHash(node, null);
    const b = computeNodeHash({ ...node, seq: 2 }, a);
    expect(computeRootHash([a, b])).not.toBe(computeRootHash([b, a]));
    expect(computeRootHash([a, b])).not.toBe(computeRootHash([a]));
  });
});
