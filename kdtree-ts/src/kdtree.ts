/**
 * KD-Tree — TypeScript implementation.
 *
 * Read this alongside the Scala version to see how the same ideas map across
 * languages. Key translations:
 *
 *   Scala `case class Point(coords: Vector[Double])`
 *   → TypeScript `interface Point { coords: number[] }`
 *
 *   Scala `enum KDTree { case Empty; case Node(...) }`
 *   → TypeScript discriminated union: `{ kind: "empty" } | { kind: "node"; ... }`
 *
 *   Scala `tree match { case Empty => ... case Node(...) => ... }`
 *   → TypeScript `if (tree.kind === "empty") { ... } else { ... }`
 *
 *   Scala `node.copy(left = ...)` (immutable update)
 *   → TypeScript `{ ...node, left: ... }` (spread = shallow copy with override)
 */

// ─── Log helpers ─────────────────────────────────────────────────────────────

/** Maps an axis index to a readable letter: `0 → "X"`, `1 → "Y"`, `2 → "Z"`, else `"axisN"`. */
const axisName = (axis: number): string => ["X", "Y", "Z"][axis] ?? `axis${axis}`;

/** Formats a single point as `"(x, y, …)"`. */
const fmtPt = (p: Point): string => `(${p.coords.join(", ")})`;

/** Formats a point array as `"(x, y), (a, b), …"`, or `"(none)"` when empty. */
const fmtPts = (pts: Point[]): string => pts.length ? pts.map(fmtPt).join(", ") : "(none)";

/** Returns an indentation string of `depth * 2` spaces for log alignment. */
const ind = (depth: number): string => "  ".repeat(depth);

// ─── Point ───────────────────────────────────────────────────────────────────

/** Point in k-dimensional space. Coordinates stored as a plain number array. */
export interface Point {
  coords: number[];
}

/**
 * Factory for `Point`. Prefer `pt(1, 2)` over `{ coords: [1, 2] }` at call sites.
 * @throws if called with zero arguments — a point needs at least one dimension.
 */
export function pt(...coords: number[]): Point {
  if (coords.length === 0) throw new Error("Point must have at least 1 dimension");
  return { coords };
}

/** Returns the number of dimensions (k) of a point. */
export function numDims(p: Point): number {
  return p.coords.length;
}

/** Returns `p`'s coordinate on the given axis. Mirrors Scala's `point(i)`. */
function coord(p: Point, axis: number): number {
  return p.coords[axis];
}

/**
 * Squared Euclidean distance between two points.
 *
 * `sqrt` is omitted because it is monotonic — `A² < B²` implies `A < B` —
 * so distance comparisons are valid without it.
 */
export function distanceSq(a: Point, b: Point): number {
  return a.coords.reduce((sum, v, i) => sum + (v - b.coords[i]) ** 2, 0);
}

/** Deep equality: true when every coordinate of `a` matches `b`. */
function pointEq(a: Point, b: Point): boolean {
  return (
    a.coords.length === b.coords.length &&
    a.coords.every((v, i) => v === b.coords[i])
  );
}

// ─── KDTree ──────────────────────────────────────────────────────────────────

// A discriminated union is TypeScript's way of doing what Scala does with
// sealed enums/traits. The `kind` field is the "tag" that lets TypeScript
// (and you) know which case you're in at any given point.
//
//   { kind: "empty" }              → Scala's `KDTree.Empty`
//   { kind: "node"; ... }         → Scala's `KDTree.Node(...)`
export type KDTree =
  | { kind: "empty" }
  | { kind: "node"; point: Point; axis: number; left: KDTree; right: KDTree };

/** Singleton empty tree. One shared object suffices — it carries no data. */
export const EMPTY: KDTree = { kind: "empty" };

/** Node constructor. Mirrors Scala's `KDTree.Node(point, axis, left, right)`. */
function makeNode(point: Point, axis: number, left: KDTree, right: KDTree): KDTree {
  return { kind: "node", point, axis, left, right };
}

// ─── build ───────────────────────────────────────────────────────────────────

/**
 * Build a balanced KD-tree from an array of points. O(n log² n).
 *
 * How it works, step by step:
 *   1. Pick a split axis by cycling through 0, 1, 2, … as we go deeper.
 *   2. Sort the points along that axis.
 *   3. The middle point (median) becomes this node's pivot.
 *   4. Everything to the left of the median → left subtree (recurse).
 *   5. Everything to the right of the median → right subtree (recurse).
 *
 * Using the median as pivot ensures the tree stays balanced. An unbalanced
 * tree (built by inserting in a bad order) degrades queries to O(n).
 */
export function build(points: Point[], depth = 0): KDTree {
  if (points.length === 0) {
    console.log(`${ind(depth)}[build] No points → EMPTY`);
    return EMPTY;
  }

  // depth % k cycles: 0, 1, 2, …, k-1, 0, 1, 2, … so each level of the
  // tree splits on a different axis. This is what makes it a *k*-d tree.
  const axis = depth % numDims(points[0]);
  console.log(`${ind(depth)}[build] depth=${depth} | ${points.length} point(s): ${fmtPts(points)}`);
  console.log(`${ind(depth)}[build] Split axis = ${axis} (${axisName(axis)})`);

  // We must not mutate the input array, so we spread-copy before sorting.
  const sorted = [...points].sort((a, b) => coord(a, axis) - coord(b, axis));
  console.log(`${ind(depth)}[build] After sort by ${axisName(axis)}: ${fmtPts(sorted)}`);

  const mid = Math.floor(sorted.length / 2);
  console.log(`${ind(depth)}[build] Median index=${mid} → pivot = ${fmtPt(sorted[mid])}`);
  console.log(`${ind(depth)}[build] Left  (smaller ${axisName(axis)}): ${fmtPts(sorted.slice(0, mid))}`);
  console.log(`${ind(depth)}[build] Right (larger  ${axisName(axis)}): ${fmtPts(sorted.slice(mid + 1))}`);

  return makeNode(
    sorted[mid],                              // pivot — the median point
    axis,
    build(sorted.slice(0, mid), depth + 1),  // left  — smaller coords on this axis
    build(sorted.slice(mid + 1), depth + 1), // right — larger  coords on this axis
  );
}

// ─── insert ──────────────────────────────────────────────────────────────────

/**
 * Insert a point into an existing tree. O(log n) on balanced trees.
 *
 * We walk down the tree the same way build() does:
 *   - At each node, compare the new point's coord on this node's axis.
 *   - ≤ pivot → go left. > pivot → go right.
 *   - When we hit EMPTY, that's where the new node lives.
 *   - Duplicate: point already exists → return tree unchanged.
 *
 * Note: repeated inserts can unbalance the tree. For frequently changing
 * data, consider rebuilding periodically with build().
 */
export function insert(tree: KDTree, point: Point, depth = 0): KDTree {
  if (tree.kind === "empty") {
    // Reached a null leaf — place the new node here.
    // depth % k gives the correct split axis for this level.
    const axis = depth % numDims(point);
    console.log(`${ind(depth)}[insert] Hit empty slot → place ${fmtPt(point)} here (axis=${axis}/${axisName(axis)})`);
    return makeNode(point, axis, EMPTY, EMPTY);
  }

  // After checking `tree.kind === "empty"`, TypeScript knows tree is the
  // node variant here, so we can destructure it safely.
  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) {
    console.log(`${ind(depth)}[insert] ${fmtPt(point)} already exists → skip (no duplicate)`);
    return tree; // duplicate — no change
  }

  const newCoord   = coord(point, axis);
  const pivotCoord = coord(p, axis);
  const goLeft     = newCoord <= pivotCoord;
  console.log(`${ind(depth)}[insert] At node ${fmtPt(p)} | axis=${axis}(${axisName(axis)}): new[${axisName(axis)}]=${newCoord} ${goLeft ? "<=" : ">"} pivot[${axisName(axis)}]=${pivotCoord} → go ${goLeft ? "LEFT" : "RIGHT"}`);

  if (goLeft) {
    // New point's coord is ≤ pivot on this axis → belongs in left subtree.
    // { ...tree, left: ... } creates a new node object with left replaced.
    // This is immutable — the original tree is untouched.
    return { ...tree, left: insert(left, point, depth + 1) };
  } else {
    return { ...tree, right: insert(right, point, depth + 1) };
  }
}

// ─── contains ────────────────────────────────────────────────────────────────

/**
 * Exact membership test. O(log n) on balanced trees.
 *
 * Follows the exact same left/right logic as insert(). If we reach EMPTY
 * without finding the point, it's not in the tree.
 */
export function contains(tree: KDTree, point: Point, depth = 0): boolean {
  if (tree.kind === "empty") {
    console.log(`${ind(depth)}[contains] Hit empty → ${fmtPt(point)} NOT in tree`);
    return false;
  }

  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) {
    console.log(`${ind(depth)}[contains] FOUND ${fmtPt(point)}!`);
    return true;
  }

  const targetCoord = coord(point, axis);
  const pivotCoord  = coord(p, axis);
  const goLeft      = targetCoord <= pivotCoord;
  console.log(`${ind(depth)}[contains] At node ${fmtPt(p)} | axis=${axis}(${axisName(axis)}): target[${axisName(axis)}]=${targetCoord} ${goLeft ? "<=" : ">"} pivot=${pivotCoord} → search ${goLeft ? "LEFT" : "RIGHT"}`);

  if (goLeft) {
    return contains(left, point, depth + 1);
  } else {
    return contains(right, point, depth + 1);
  }
}

// ─── findMin ─────────────────────────────────────────────────────────────────

/**
 * Find the point with the smallest coordinate on `searchAxis`. O(n) worst case.
 *
 * This is trickier than a normal BST minimum because each level splits on a
 * *different* axis:
 *
 *   Case A — node's split axis == searchAxis:
 *     The BST property holds on this axis here: everything in the right
 *     subtree is > pivot. So we can safely skip the right subtree entirely.
 *     Minimum is either the pivot or something in the left subtree.
 *
 *   Case B — node's split axis != searchAxis:
 *     No BST property on searchAxis at this level. The minimum could live
 *     anywhere — we must check both subtrees and the pivot.
 */
export function findMin(tree: KDTree, searchAxis: number, depth = 0): Point | null {
  if (tree.kind === "empty") {
    console.log(`${ind(depth)}[findMin] Empty → null`);
    return null;
  }

  const { point: p, axis, left, right } = tree;
  console.log(`${ind(depth)}[findMin] At node ${fmtPt(p)} | split-axis=${axis}(${axisName(axis)}), search-axis=${searchAxis}(${axisName(searchAxis)})`);

  // Pick the smaller of two points on searchAxis, allowing null (absent child).
  const minOf = (a: Point, b: Point | null): Point =>
    b === null || coord(a, searchAxis) <= coord(b, searchAxis) ? a : b;

  if (axis === searchAxis) {
    // Case A: right subtree has only values > p on this axis — prune it.
    console.log(`${ind(depth)}[findMin]   Case A: split axis == search axis → PRUNE right (all right values > pivot on ${axisName(searchAxis)})`);
    const leftMin = findMin(left, searchAxis, depth + 1);
    const result  = minOf(p, leftMin);
    console.log(`${ind(depth)}[findMin]   Best of pivot=${fmtPt(p)} vs leftMin=${leftMin ? fmtPt(leftMin) : "null"} → ${fmtPt(result)}`);
    return result;
  } else {
    // Case B: minimum could be anywhere — check both sides.
    console.log(`${ind(depth)}[findMin]   Case B: split axis != search axis → check BOTH sides`);
    const leftMin  = findMin(left,  searchAxis, depth + 1);
    const rightMin = findMin(right, searchAxis, depth + 1);

    // Collapse two nullable candidates into one before comparing with p.
    const childMin =
      leftMin === null  ? rightMin :
      rightMin === null ? leftMin  :
      coord(leftMin, searchAxis) <= coord(rightMin, searchAxis) ? leftMin : rightMin;

    const result = minOf(p, childMin);
    console.log(`${ind(depth)}[findMin]   leftMin=${leftMin ? fmtPt(leftMin) : "null"}, rightMin=${rightMin ? fmtPt(rightMin) : "null"}, childMin=${childMin ? fmtPt(childMin) : "null"}`);
    console.log(`${ind(depth)}[findMin]   Best of pivot=${fmtPt(p)} vs childMin → ${fmtPt(result)}`);
    return result;
  }
}

// ─── remove ──────────────────────────────────────────────────────────────────

/**
 * Remove a point from the tree. No-op if not found. O(log n) average.
 *
 * Deleting from a KD-tree is harder than from a normal BST because we can't
 * simply swap with the in-order successor — the successor lives on a different
 * axis at a different level, so swapping would break invariants.
 *
 * Instead, we replace the deleted node with the *minimum on this node's axis*
 * from the appropriate subtree. That minimum is guaranteed to be ≥ everything
 * in the left subtree on this axis, so placing it here preserves the invariant.
 *
 * Three cases when we find the node to delete:
 *
 *   1. Leaf (no children)
 *      → Just return EMPTY.
 *
 *   2. Has a right subtree
 *      → Find the minimum in the right subtree on this axis (call it S).
 *         Replace current point with S. Delete S from the right subtree.
 *         S is safe here because: it came from the right, so it's ≥ everything
 *         on the left; and it's the minimum of the right side, so the right
 *         BST property still holds after removal.
 *
 *   3. Only a left subtree (no right child)
 *      → We can't just promote left as-is, because the left subtree contains
 *         values ≤ current pivot — they'd need to go on the right side now.
 *         So: find the minimum of the *left* subtree on this axis, promote it
 *         to the current position, then move the entire left subtree to the
 *         *right* slot (so the invariant right ≥ pivot holds).
 */
export function remove(tree: KDTree, point: Point, depth = 0): KDTree {
  if (tree.kind === "empty") {
    console.log(`${ind(depth)}[remove] Hit empty → ${fmtPt(point)} not found, no-op`);
    return EMPTY; // point not found — no-op
  }

  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) {
    // Found the node. Apply one of the three cases above.
    console.log(`${ind(depth)}[remove] FOUND ${fmtPt(point)}!`);

    if (right.kind !== "empty") {
      // Case 2: successor is the minimum of the right subtree on this axis.
      const successor = findMin(right, axis)!; // ! = we know it's non-null (right is non-empty)
      console.log(`${ind(depth)}[remove]   Case 2: has right subtree → successor = min on ${axisName(axis)} from right subtree = ${fmtPt(successor)}`);
      console.log(`${ind(depth)}[remove]   Replace this node's point with ${fmtPt(successor)}, then delete ${fmtPt(successor)} from right subtree`);
      return makeNode(
        successor,
        axis,
        left,
        remove(right, successor, depth + 1), // delete successor from right subtree
      );
    }

    if (left.kind !== "empty") {
      // Case 3: no right child — borrow from left, then rotate left → right.
      const successor = findMin(left, axis)!;
      console.log(`${ind(depth)}[remove]   Case 3: only left subtree → successor = min on ${axisName(axis)} from left = ${fmtPt(successor)}`);
      console.log(`${ind(depth)}[remove]   Promote ${fmtPt(successor)} here, move old left subtree to the RIGHT slot`);
      return makeNode(
        successor,
        axis,
        EMPTY,                                // left slot is now empty
        remove(left, successor, depth + 1),  // old left subtree moves to right slot
      );
    }

    // Case 1: leaf node — just drop it.
    console.log(`${ind(depth)}[remove]   Case 1: leaf node (no children) → return EMPTY`);
    return EMPTY;
  }

  // Not the target node — keep descending.
  const targetCoord = coord(point, axis);
  const pivotCoord  = coord(p, axis);
  const goLeft      = targetCoord <= pivotCoord;
  console.log(`${ind(depth)}[remove] At node ${fmtPt(p)} | axis=${axis}(${axisName(axis)}): target[${axisName(axis)}]=${targetCoord} ${goLeft ? "<=" : ">"} pivot=${pivotCoord} → search ${goLeft ? "LEFT" : "RIGHT"}`);

  if (goLeft) {
    return { ...tree, left:  remove(left,  point, depth + 1) };
  } else {
    return { ...tree, right: remove(right, point, depth + 1) };
  }
}

// ─── nearestNeighbor ─────────────────────────────────────────────────────────

/**
 * Find the closest point to `target` in the tree. O(log n) average.
 *
 * The naive approach visits every point — O(n). We do better by pruning
 * entire subtrees using the distance to the *splitting hyperplane*:
 *
 *   1. Visit the "near" child first (the side where target lives).
 *      This gives us a good best-so-far early, which enables more pruning.
 *
 *   2. Compute the distance from target to the splitting hyperplane at this node.
 *      (On an axis-aligned plane, that distance is just |target[axis] - pivot[axis]|.)
 *
 *   3. If that hyperplane distance > current best distance, the far subtree
 *      cannot contain anything closer → skip it entirely.
 *      Otherwise we must check the far side too.
 */
export function nearestNeighbor(tree: KDTree, target: Point): Point | null {
  console.log(`[NN] Looking for nearest neighbor to ${fmtPt(target)}`);

  // Which of two points is closer to target?
  function closer(a: Point, b: Point): Point {
    return distanceSq(a, target) <= distanceSq(b, target) ? a : b;
  }

  function loop(node_: KDTree, best: Point | null, depth: number): Point | null {
    if (node_.kind === "empty") {
      console.log(`${ind(depth)}[NN] Empty node → return best=${best ? fmtPt(best) : "null"}`);
      return best;
    }

    const { point: p, axis, left, right } = node_;

    // Update best with the current node's point.
    const candidate    = best === null ? p : closer(p, best);
    const distToCurrent = Math.sqrt(distanceSq(p, target)).toFixed(2);
    const distToBest    = best ? Math.sqrt(distanceSq(best, target)).toFixed(2) : "∞";
    console.log(`${ind(depth)}[NN] Visit ${fmtPt(p)} | dist-to-target=${distToCurrent} | best-so-far=${best ? fmtPt(best) : "none"} (dist=${distToBest})`);
    if (best !== null && distanceSq(p, target) < distanceSq(best, target)) {
      console.log(`${ind(depth)}[NN]   → NEW best: ${fmtPt(p)} is closer than ${fmtPt(best)}`);
    }

    // Decide which child to visit first. Visiting the "near" child first
    // (the one on the same side as target) usually yields a good best-so-far
    // quickly, which then prunes the far side more aggressively.
    const goLeft      = coord(target, axis) <= coord(p, axis);
    const [near, far] = goLeft ? [left, right] : [right, left];
    console.log(`${ind(depth)}[NN]   target[${axisName(axis)}]=${coord(target, axis)} ${goLeft ? "<=" : ">"} pivot[${axisName(axis)}]=${coord(p, axis)} → visit ${goLeft ? "LEFT" : "RIGHT"} first (near side)`);

    const afterNear = loop(near, candidate, depth + 1);

    // Distance from target to the splitting hyperplane (squared, to stay
    // consistent with distanceSq — we never compare apples to oranges).
    const axisDistSq = (coord(target, axis) - coord(p, axis)) ** 2;
    const bestDistSq = afterNear === null ? Infinity : distanceSq(afterNear, target);
    const shouldCheckFar = axisDistSq <= bestDistSq;
    console.log(`${ind(depth)}[NN]   Hyperplane dist²=${axisDistSq.toFixed(2)} ${shouldCheckFar ? "<=" : ">"} best dist²=${bestDistSq === Infinity ? "∞" : bestDistSq.toFixed(2)} → ${shouldCheckFar ? "MUST check far side (circle crosses hyperplane)" : "PRUNE far side (best circle doesn't reach it)"}`);

    // Prune far side if the hyperplane is farther than our current best.
    return shouldCheckFar ? loop(far, afterNear, depth + 1) : afterNear;
  }

  return loop(tree, null, 0);
}

// ─── rangeSearch ─────────────────────────────────────────────────────────────

/**
 * Return all points within the axis-aligned box [lower, upper] (inclusive).
 *
 * Each node gives us a chance to prune an entire subtree:
 *   - If lower[axis] > pivot[axis], nothing in the left subtree can be
 *     inside the box (all left values are ≤ pivot < lower) → skip left.
 *   - If upper[axis] < pivot[axis], nothing in the right subtree qualifies
 *     (all right values are ≥ pivot > upper) → skip right.
 */
export function rangeSearch(tree: KDTree, lower: Point, upper: Point): Point[] {
  console.log(`[range] Searching box [${fmtPt(lower)}, ${fmtPt(upper)}]`);

  function inRange(p: Point): boolean {
    return p.coords.every((v, i) => v >= lower.coords[i] && v <= upper.coords[i]);
  }

  function loop(node_: KDTree, depth: number): Point[] {
    if (node_.kind === "empty") {
      console.log(`${ind(depth)}[range] Empty → []`);
      return [];
    }

    const { point: p, axis, left, right } = node_;
    const pivotVal = coord(p, axis);
    const lowerVal = coord(lower, axis);
    const upperVal = coord(upper, axis);

    console.log(`${ind(depth)}[range] At node ${fmtPt(p)} | axis=${axis}(${axisName(axis)}): pivot=${pivotVal}, range=[${lowerVal}, ${upperVal}]`);

    const here = inRange(p) ? [p] : [];
    console.log(`${ind(depth)}[range]   Pivot inside box? ${here.length ? "YES → include" : "NO → skip"}`);

    const goLeft  = lowerVal <= pivotVal;
    const goRight = upperVal >= pivotVal;
    console.log(`${ind(depth)}[range]   Search LEFT?  lower(${lowerVal}) <= pivot(${pivotVal}) → ${goLeft  ? "YES" : "NO (PRUNE left)"}`);
    console.log(`${ind(depth)}[range]   Search RIGHT? upper(${upperVal}) >= pivot(${pivotVal}) → ${goRight ? "YES" : "NO (PRUNE right)"}`);

    const searchLeft  = goLeft  ? loop(left,  depth + 1) : [];
    const searchRight = goRight ? loop(right, depth + 1) : [];

    const found = [...here, ...searchLeft, ...searchRight];
    if (found.length) console.log(`${ind(depth)}[range]   Collected from this subtree: ${fmtPts(found)}`);
    return found;
  }

  return loop(tree, 0);
}
