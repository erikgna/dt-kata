import { describe, it, expect } from "vitest";
import { build, remove, pt } from "../kdtree.js";
import type { KDTree } from "../kdtree.js";
import { removeSteps, insertSteps } from "./stepGenerators.js";

const pts = [pt(3, 6), pt(17, 15), pt(13, 15), pt(6, 12), pt(9, 1), pt(2, 7), pt(10, 19)];

function shape(t: KDTree): unknown {
  if (t.kind === "empty") return null;
  return { p: t.point.coords, a: t.axis, l: shape(t.left), r: shape(t.right) };
}

describe("removeSteps snapshots", () => {
  for (const target of pts) {
    it(`final snapshot matches remove() for ${target.coords}`, () => {
      const tree = build(pts);
      const steps = removeSteps(tree, target);
      const last = steps[steps.length - 1];
      expect(last.message).toContain("Remove complete");
      expect(shape(last.treeSnapshot!)).toEqual(shape(remove(tree, target)));
      // every step carries a snapshot
      for (const s of steps) expect(s.treeSnapshot).toBeDefined();
      // first step shows the UNCHANGED tree (nothing happens before stepping)
      expect(shape(steps[0].treeSnapshot!)).toEqual(shape(tree));
    });
  }

  it("narrates findMin + duplicate phase for internal node (2,7)", () => {
    const tree = build(pts);
    const msgs = removeSteps(tree, pt(2, 7)).map(s => s.message);
    expect(msgs.some(m => m.includes("case 2"))).toBe(true);
    expect(msgs.some(m => m.includes("findMin"))).toBe(true);
    expect(msgs.some(m => m.includes("TWICE"))).toBe(true);
    expect(msgs.some(m => m.includes("Remove complete"))).toBe(true);
  });

  it("insertSteps: first step unchanged tree, last step has the new point", () => {
    const tree = build(pts);
    const steps = insertSteps(tree, pt(5, 10));
    expect(shape(steps[0].treeSnapshot!)).toEqual(shape(tree));
    const last = steps[steps.length - 1];
    expect(last.message).toContain("inserted");
    expect(JSON.stringify(shape(last.treeSnapshot!))).toContain("[5,10]");
  });
});
