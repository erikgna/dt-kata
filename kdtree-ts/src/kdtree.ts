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

// ─── Point ───────────────────────────────────────────────────────────────────

// A point in k-dimensional space. We use a plain number array for the coords.
export interface Point {
  coords: number[];
}

// Factory function — call pt(1, 2) instead of { coords: [1, 2] } everywhere.
export function pt(...coords: number[]): Point {
  if (coords.length === 0) throw new Error("Point must have at least 1 dimension");
  return { coords };
}

// Number of dimensions (also called k).
export function numDims(p: Point): number {
  return p.coords.length;
}

// Get coordinate on a single axis. Mirrors Scala's `point(i)`.
function coord(p: Point, axis: number): number {
  return p.coords[axis];
}

// Squared Euclidean distance. We skip sqrt because sqrt is monotonic —
// if A² < B² then A < B, so we can compare distances without it.
export function distanceSq(a: Point, b: Point): number {
  return a.coords.reduce((sum, v, i) => sum + (v - b.coords[i]) ** 2, 0);
}

// Deep equality: two points are equal if every coordinate matches.
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

// Singleton empty tree — one shared object is enough since it carries no data.
export const EMPTY: KDTree = { kind: "empty" };

// Node constructor — mirrors Scala's `KDTree.Node(point, axis, left, right)`.
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
  if (points.length === 0) return EMPTY;

  // depth % k cycles: 0, 1, 2, …, k-1, 0, 1, 2, … so each level of the
  // tree splits on a different axis. This is what makes it a *k*-d tree.
  const axis = depth % numDims(points[0]);

  // We must not mutate the input array, so we spread-copy before sorting.
  const sorted = [...points].sort((a, b) => coord(a, axis) - coord(b, axis));

  const mid = Math.floor(sorted.length / 2);

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
    return makeNode(point, depth % numDims(point), EMPTY, EMPTY);
  }

  // After checking `tree.kind === "empty"`, TypeScript knows tree is the
  // node variant here, so we can destructure it safely.
  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) return tree; // duplicate — no change

  if (coord(point, axis) <= coord(p, axis)) {
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
  if (tree.kind === "empty") return false;

  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) return true;

  if (coord(point, axis) <= coord(p, axis)) {
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
export function findMin(tree: KDTree, searchAxis: number): Point | null {
  if (tree.kind === "empty") return null;

  const { point: p, axis, left, right } = tree;

  // Pick the smaller of two points on searchAxis, allowing null (absent child).
  const minOf = (a: Point, b: Point | null): Point =>
    b === null || coord(a, searchAxis) <= coord(b, searchAxis) ? a : b;

  if (axis === searchAxis) {
    // Case A: right subtree has only values > p on this axis — prune it.
    return minOf(p, findMin(left, searchAxis));
  } else {
    // Case B: minimum could be anywhere — check both sides.
    const leftMin  = findMin(left,  searchAxis);
    const rightMin = findMin(right, searchAxis);

    // Collapse two nullable candidates into one before comparing with p.
    const childMin =
      leftMin === null  ? rightMin :
      rightMin === null ? leftMin  :
      coord(leftMin, searchAxis) <= coord(rightMin, searchAxis) ? leftMin : rightMin;

    return minOf(p, childMin);
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
  if (tree.kind === "empty") return EMPTY; // point not found — no-op

  const { point: p, axis, left, right } = tree;

  if (pointEq(p, point)) {
    // Found the node. Apply one of the three cases above.

    if (right.kind !== "empty") {
      // Case 2: successor is the minimum of the right subtree on this axis.
      const successor = findMin(right, axis)!; // ! = we know it's non-null (right is non-empty)
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
      return makeNode(
        successor,
        axis,
        EMPTY,                                // left slot is now empty
        remove(left, successor, depth + 1),  // old left subtree moves to right slot
      );
    }

    // Case 1: leaf node — just drop it.
    return EMPTY;
  }

  // Not the target node — keep descending.
  if (coord(point, axis) <= coord(p, axis)) {
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
  // Which of two points is closer to target?
  function closer(a: Point, b: Point): Point {
    return distanceSq(a, target) <= distanceSq(b, target) ? a : b;
  }

  function loop(node_: KDTree, best: Point | null): Point | null {
    if (node_.kind === "empty") return best;

    const { point: p, axis, left, right } = node_;

    // Update best with the current node's point.
    const candidate = best === null ? p : closer(p, best);

    // Decide which child to visit first. Visiting the "near" child first
    // (the one on the same side as target) usually yields a good best-so-far
    // quickly, which then prunes the far side more aggressively.
    const [near, far] =
      coord(target, axis) <= coord(p, axis) ? [left, right] : [right, left];

    const afterNear = loop(near, candidate);

    // Distance from target to the splitting hyperplane (squared, to stay
    // consistent with distanceSq — we never compare apples to oranges).
    const axisDistSq = (coord(target, axis) - coord(p, axis)) ** 2;
    const bestDistSq = afterNear === null ? Infinity : distanceSq(afterNear, target);

    // Prune far side if the hyperplane is farther than our current best.
    return axisDistSq <= bestDistSq ? loop(far, afterNear) : afterNear;
  }

  return loop(tree, null);
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
  function inRange(p: Point): boolean {
    return p.coords.every((v, i) => v >= lower.coords[i] && v <= upper.coords[i]);
  }

  function loop(node_: KDTree): Point[] {
    if (node_.kind === "empty") return [];

    const { point: p, axis, left, right } = node_;

    const here        = inRange(p) ? [p] : [];
    const searchLeft  = coord(lower, axis) <= coord(p, axis) ? loop(left)  : [];
    const searchRight = coord(upper, axis) >= coord(p, axis) ? loop(right) : [];

    return [...here, ...searchLeft, ...searchRight];
  }

  return loop(tree);
}
