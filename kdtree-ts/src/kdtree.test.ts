import { describe, it, expect } from "vitest";
import {
  pt, distanceSq, numDims,
  EMPTY, build, insert, contains, findMin, remove, nearestNeighbor, rangeSearch,
} from "./kdtree.js";

// ── helpers ──────────────────────────────────────────────────────────────────

const pts2D = [
  pt(3, 6), pt(17, 15), pt(13, 15), pt(6, 12),
  pt(9, 1), pt(2, 7), pt(10, 19),
];

function minByAxis(points: ReturnType<typeof pt>[], axis: number) {
  return points.reduce((min, p) => p.coords[axis] < min.coords[axis] ? p : min);
}

// ── Point ─────────────────────────────────────────────────────────────────────

describe("pt()", () => {
  it("reports correct dimensionality", () => {
    expect(numDims(pt(1, 2))).toBe(2);
    expect(numDims(pt(1, 2, 3))).toBe(3);
  });

  it("computes squared distance correctly", () => {
    expect(distanceSq(pt(0, 0), pt(3, 4))).toBe(25);
    expect(distanceSq(pt(1, 1), pt(1, 1))).toBe(0);
  });

  it("rejects empty coords", () => {
    expect(() => pt()).toThrow("at least 1 dimension");
  });
});

// ── build ─────────────────────────────────────────────────────────────────────

describe("build()", () => {
  it("returns EMPTY for an empty input", () => {
    expect(build([])).toBe(EMPTY);
  });

  it("contains all inserted points after build", () => {
    const tree = build(pts2D);
    for (const p of pts2D) expect(contains(tree, p)).toBe(true);
  });

  it("does not report a point that was never inserted", () => {
    const tree = build(pts2D);
    expect(contains(tree, pt(0, 0))).toBe(false);
  });
});

// ── insert ────────────────────────────────────────────────────────────────────

describe("insert()", () => {
  it("adds a point to an empty tree", () => {
    const tree = insert(EMPTY, pt(1, 2));
    expect(contains(tree, pt(1, 2))).toBe(true);
  });

  it("ignores duplicates — tree structure unchanged", () => {
    const t1 = build(pts2D);
    const t2 = insert(t1, pts2D[0]);
    expect(t1).toEqual(t2); // same shape, same values
  });

  it("builds incrementally and matches contains results", () => {
    const tree = pts2D.reduce((t, p) => insert(t, p), EMPTY);
    for (const p of pts2D) expect(contains(tree, p)).toBe(true);
  });
});

// ── nearestNeighbor ───────────────────────────────────────────────────────────

describe("nearestNeighbor()", () => {
  it("returns null on an empty tree", () => {
    expect(nearestNeighbor(EMPTY, pt(1, 1))).toBeNull();
  });

  it("returns the only point in a single-node tree", () => {
    const tree = build([pt(5, 5)]);
    expect(nearestNeighbor(tree, pt(0, 0))).toEqual(pt(5, 5));
  });

  it("finds the exact point when it is in the tree", () => {
    const tree = build(pts2D);
    expect(nearestNeighbor(tree, pt(9, 1))).toEqual(pt(9, 1));
  });

  it("finds the closest point by Euclidean distance", () => {
    const tree   = build(pts2D);
    const target = pt(10, 12);
    const expected = pts2D.reduce((best, p) =>
      distanceSq(p, target) < distanceSq(best, target) ? p : best
    );
    expect(nearestNeighbor(tree, target)).toEqual(expected);
  });

  it("works correctly in 3D", () => {
    const points = [pt(1, 2, 3), pt(4, 5, 6), pt(7, 8, 9), pt(0, 0, 1)];
    const tree   = build(points);
    const target = pt(1, 1, 1);
    const expected = points.reduce((best, p) =>
      distanceSq(p, target) < distanceSq(best, target) ? p : best
    );
    expect(nearestNeighbor(tree, target)).toEqual(expected);
  });
});

// ── rangeSearch ───────────────────────────────────────────────────────────────

describe("rangeSearch()", () => {
  it("returns [] for an empty tree", () => {
    expect(rangeSearch(EMPTY, pt(0, 0), pt(10, 10))).toEqual([]);
  });

  it("returns all points when range covers the whole space", () => {
    const tree   = build(pts2D);
    const result = rangeSearch(tree, pt(-1000, -1000), pt(1000, 1000));
    expect(new Set(result)).toEqual(new Set(pts2D));
  });

  it("returns [] when range is far from all points", () => {
    const tree   = build(pts2D);
    const result = rangeSearch(tree, pt(100, 100), pt(200, 200));
    expect(result).toEqual([]);
  });

  it("returns only points inside the given range", () => {
    const tree     = build(pts2D);
    const result   = rangeSearch(tree, pt(0, 0), pt(10, 10));
    const expected = pts2D.filter(p => p.coords[0] >= 0 && p.coords[0] <= 10
                                    && p.coords[1] >= 0 && p.coords[1] <= 10);
    expect(new Set(result)).toEqual(new Set(expected));
  });

  it("includes boundary points (inclusive range)", () => {
    const tree   = build(pts2D);
    const result = rangeSearch(tree, pt(9, 1), pt(17, 15));
    expect(result).toContainEqual(pt(9, 1));
  });
});

// ── findMin ───────────────────────────────────────────────────────────────────

describe("findMin()", () => {
  it("returns null on an empty tree", () => {
    expect(findMin(EMPTY, 0)).toBeNull();
  });

  it("returns the only point in a single-node tree", () => {
    const tree = build([pt(5, 3)]);
    expect(findMin(tree, 0)).toEqual(pt(5, 3));
    expect(findMin(tree, 1)).toEqual(pt(5, 3));
  });

  it("finds the minimum along axis 0 (x)", () => {
    const tree     = build(pts2D);
    const expected = minByAxis(pts2D, 0);
    expect(findMin(tree, 0)).toEqual(expected);
  });

  it("finds the minimum along axis 1 (y)", () => {
    const tree     = build(pts2D);
    const expected = minByAxis(pts2D, 1);
    expect(findMin(tree, 1)).toEqual(expected);
  });

  it("works on a 3D tree for every axis", () => {
    const points = [pt(3, 1, 4), pt(1, 5, 9), pt(2, 6, 5), pt(8, 9, 7)];
    const tree   = build(points);
    for (let axis = 0; axis < 3; axis++) {
      expect(findMin(tree, axis)).toEqual(minByAxis(points, axis));
    }
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe("remove()", () => {
  it("returns EMPTY when removing from an empty tree", () => {
    expect(remove(EMPTY, pt(1, 2))).toBe(EMPTY);
  });

  it("is a no-op when the point is not in the tree", () => {
    const tree    = build(pts2D);
    const removed = remove(tree, pt(0, 0));
    for (const p of pts2D) expect(contains(removed, p)).toBe(true);
  });

  it("removes a leaf node — tree becomes EMPTY", () => {
    const tree    = insert(EMPTY, pt(1, 2));
    const removed = remove(tree, pt(1, 2));
    expect(removed).toBe(EMPTY);
  });

  it("removes each point without affecting the others", () => {
    const tree = build(pts2D);
    for (const target of pts2D) {
      const removed = remove(tree, target);
      expect(contains(removed, target)).toBe(false);
      for (const other of pts2D.filter(p => p !== target)) {
        expect(contains(removed, other)).toBe(true);
      }
    }
  });

  it("allows re-insertion after removal", () => {
    const tree    = build(pts2D);
    const target  = pts2D[0];
    const removed = remove(tree, target);
    const readded = insert(removed, target);
    expect(contains(readded, target)).toBe(true);
  });

  it("handles removing all points one by one", () => {
    const tree  = build(pts2D);
    const empty = pts2D.reduce((t, p) => remove(t, p), tree);
    for (const p of pts2D) expect(contains(empty, p)).toBe(false);
  });
});
