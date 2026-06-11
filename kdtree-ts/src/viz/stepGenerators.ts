import type { Point, KDTree } from "../kdtree.js";
import { EMPTY } from "../kdtree.js";
import type { Step } from "./types.js";

// ── Internal helpers (mirror kdtree.ts logic without console.log) ─────────────

const axisLabel = (a: number) => ["X", "Y", "Z"][a] ?? `axis${a}`;
const fmt       = (p: Point) => `(${p.coords.join(", ")})`;
const at        = (p: Point, a: number) => p.coords[a];
const eq        = (a: Point, b: Point) =>
  a.coords.length === b.coords.length && a.coords.every((v, i) => v === b.coords[i]);
const dSq       = (a: Point, b: Point) =>
  a.coords.reduce((s, v, i) => s + (v - b.coords[i]) ** 2, 0);
const node      = (point: Point, axis: number, left: KDTree, right: KDTree): KDTree =>
  ({ kind: "node", point, axis, left, right });

// Pure insert (no console noise) — used to build the final-step snapshot.
function insertPure(t: KDTree, p: Point, depth = 0): KDTree {
  if (t.kind === "empty") return node(p, depth % p.coords.length, EMPTY, EMPTY);
  if (eq(t.point, p)) return t;
  const goLeft = at(p, t.axis) <= at(t.point, t.axis);
  return goLeft
    ? { ...t, left:  insertPure(t.left,  p, depth + 1) }
    : { ...t, right: insertPure(t.right, p, depth + 1) };
}

// ── Insert ────────────────────────────────────────────────────────────────────

export function insertSteps(tree: KDTree, point: Point): Step[] {
  const steps: Step[] = [];
  let inserted = true;

  function walk(n: KDTree, depth: number): void {
    if (n.kind === "empty") {
      const axis = depth % point.coords.length;
      steps.push({
        kind: "insert_here",
        visitedPoint: null,
        queryPoint: point,
        axis,
        treeSnapshot: tree,
        message: `Empty slot at depth ${depth} — inserting ${fmt(point)} here (split will be on ${axisLabel(axis)})`,
      });
      return;
    }
    const { point: p, axis, left, right } = n;
    if (eq(p, point)) {
      inserted = false;
      steps.push({
        kind: "found",
        visitedPoint: p,
        queryPoint: point,
        axis,
        treeSnapshot: tree,
        message: `${fmt(point)} already exists in the tree — duplicate skipped`,
      });
      return;
    }
    const goLeft = at(point, axis) <= at(p, axis);
    steps.push({
      kind: goLeft ? "go_left" : "go_right",
      visitedPoint: p,
      queryPoint: point,
      axis,
      treeSnapshot: tree,
      message:
        `At ${fmt(p)}, split on ${axisLabel(axis)}: ` +
        `${fmt(point)}[${axisLabel(axis)}] = ${at(point, axis)} ` +
        `${goLeft ? "≤" : ">"} pivot ${at(p, axis)} → go ${goLeft ? "LEFT" : "RIGHT"}`,
    });
    walk(goLeft ? left : right, depth + 1);
  }

  walk(tree, 0);
  if (inserted) {
    steps.push({
      kind: "found",
      visitedPoint: point,
      queryPoint: point,
      treeSnapshot: insertPure(tree, point),
      message: `${fmt(point)} inserted — tree updated.`,
    });
  }
  return steps;
}

// ── Contains ──────────────────────────────────────────────────────────────────

export function containsSteps(tree: KDTree, point: Point): Step[] {
  const steps: Step[] = [];

  function walk(node: KDTree, depth: number): void {
    if (node.kind === "empty") {
      steps.push({
        kind: "not_found",
        visitedPoint: null,
        queryPoint: point,
        message: `Reached empty slot — ${fmt(point)} is NOT in the tree`,
      });
      return;
    }
    const { point: p, axis, left, right } = node;
    if (eq(p, point)) {
      steps.push({
        kind: "found",
        visitedPoint: p,
        queryPoint: point,
        axis,
        message: `FOUND ${fmt(point)}!`,
      });
      return;
    }
    const goLeft = at(point, axis) <= at(p, axis);
    steps.push({
      kind: goLeft ? "go_left" : "go_right",
      visitedPoint: p,
      queryPoint: point,
      axis,
      message:
        `At ${fmt(p)}, split on ${axisLabel(axis)}: ` +
        `target[${axisLabel(axis)}] = ${at(point, axis)} ` +
        `${goLeft ? "≤" : ">"} pivot ${at(p, axis)} → go ${goLeft ? "LEFT" : "RIGHT"}`,
    });
    walk(goLeft ? left : right, depth + 1);
  }

  walk(tree, 0);
  return steps;
}

// ── Remove ────────────────────────────────────────────────────────────────────

export function removeSteps(tree: KDTree, point: Point): Step[] {
  const steps: Step[] = [];

  // Narrates the findMin sub-search inside a subtree and returns the successor.
  // `snapshot` = full tree state to display while this search runs.
  function narrateFindMin(sub: KDTree, searchAxis: number, snapshot: KDTree, side: string): Point {
    function go(n: KDTree): Point | null {
      if (n.kind === "empty") return null;
      const { point: p, axis, left, right } = n;
      const minOf = (a: Point, b: Point | null) =>
        b === null || at(a, searchAxis) <= at(b, searchAxis) ? a : b;
      if (axis === searchAxis) {
        steps.push({
          kind: "visit",
          visitedPoint: p,
          axis,
          treeSnapshot: snapshot,
          message:
            `findMin(${axisLabel(searchAxis)}) at ${fmt(p)}: splits on ${axisLabel(axis)} = search axis → ` +
            `right side only has bigger ${axisLabel(searchAxis)} values, PRUNE right; check pivot + left.`,
        });
        return minOf(p, go(left));
      }
      steps.push({
        kind: "visit",
        visitedPoint: p,
        axis,
        treeSnapshot: snapshot,
        message:
          `findMin(${axisLabel(searchAxis)}) at ${fmt(p)}: splits on ${axisLabel(axis)} ≠ ${axisLabel(searchAxis)} → ` +
          `min could be on either side, must check BOTH subtrees.`,
      });
      const lm = go(left);
      const rm = go(right);
      const cm =
        lm === null ? rm :
        rm === null ? lm :
        at(lm, searchAxis) <= at(rm, searchAxis) ? lm : rm;
      return minOf(p, cm);
    }
    const m = go(sub)!;
    steps.push({
      kind: "successor",
      visitedPoint: m,
      axis: searchAxis,
      treeSnapshot: snapshot,
      message: `Successor found: ${fmt(m)} has the smallest ${axisLabel(searchAxis)} in the ${side} subtree.`,
    });
    return m;
  }

  // Mirrors remove() recursion. `rebuild(sub)` reconstructs the FULL tree with
  // the current subtree replaced by `sub` — lets every step carry a whole-tree
  // snapshot, including intermediate states (successor copied = duplicate).
  function walk(n: KDTree, target: Point, rebuild: (sub: KDTree) => KDTree): KDTree {
    const snapshot = rebuild(n);
    if (n.kind === "empty") {
      steps.push({
        kind: "not_found",
        visitedPoint: null,
        queryPoint: target,
        treeSnapshot: snapshot,
        message: `${fmt(target)} not found in the tree — nothing to remove`,
      });
      return EMPTY;
    }
    const { point: p, axis, left, right } = n;

    if (eq(p, target)) {
      if (right.kind !== "empty") {
        steps.push({
          kind: "found",
          visitedPoint: p,
          queryPoint: target,
          axis,
          treeSnapshot: snapshot,
          message:
            `Found ${fmt(p)} — internal node with a right subtree (case 2). ` +
            `Can't just drop it: children would be orphaned. ` +
            `Plan: replace it with the min on ${axisLabel(axis)} from the RIGHT subtree.`,
        });
        const succ = narrateFindMin(right, axis, snapshot, "right");
        const dupSnapshot = rebuild(node(succ, axis, left, right));
        steps.push({
          kind: "successor",
          visitedPoint: succ,
          queryPoint: target,
          axis,
          treeSnapshot: dupSnapshot,
          message:
            `Copy ${fmt(succ)} into the deleted node's slot. ` +
            `It now appears TWICE — next, recursively delete the duplicate from the right subtree.`,
        });
        const newRight = walk(right, succ, sub => rebuild(node(succ, axis, left, sub)));
        return node(succ, axis, left, newRight);
      }

      if (left.kind !== "empty") {
        steps.push({
          kind: "found",
          visitedPoint: p,
          queryPoint: target,
          axis,
          treeSnapshot: snapshot,
          message:
            `Found ${fmt(p)} — only a LEFT subtree (case 3). ` +
            `Left values are ≤ pivot, so they can't stay on the left under a new pivot. ` +
            `Plan: promote min on ${axisLabel(axis)} from the left, move the rest to the RIGHT slot.`,
        });
        const succ = narrateFindMin(left, axis, snapshot, "left");
        const dupSnapshot = rebuild(node(succ, axis, EMPTY, left));
        steps.push({
          kind: "successor",
          visitedPoint: succ,
          queryPoint: target,
          axis,
          treeSnapshot: dupSnapshot,
          message:
            `Promote ${fmt(succ)}; old left subtree moves to the RIGHT slot ` +
            `(every value there is ≥ new pivot on ${axisLabel(axis)} — invariant holds). ` +
            `${fmt(succ)} appears twice — recursively delete the duplicate.`,
        });
        const newRight = walk(left, succ, sub => rebuild(node(succ, axis, EMPTY, sub)));
        return node(succ, axis, EMPTY, newRight);
      }

      steps.push({
        kind: "found",
        visitedPoint: p,
        queryPoint: target,
        axis,
        treeSnapshot: snapshot,
        message: `Found ${fmt(p)} — leaf node, no children (case 1). Just remove it.`,
      });
      steps.push({
        kind: "found",
        visitedPoint: null,
        queryPoint: target,
        treeSnapshot: rebuild(EMPTY),
        message: `${fmt(p)} removed.`,
      });
      return EMPTY;
    }

    const goLeft = at(target, axis) <= at(p, axis);
    steps.push({
      kind: goLeft ? "go_left" : "go_right",
      visitedPoint: p,
      queryPoint: target,
      axis,
      treeSnapshot: snapshot,
      message:
        `At ${fmt(p)}, split on ${axisLabel(axis)}: ` +
        `target[${axisLabel(axis)}] = ${at(target, axis)} ` +
        `${goLeft ? "≤" : ">"} pivot ${at(p, axis)} → go ${goLeft ? "LEFT" : "RIGHT"}`,
    });
    if (goLeft) {
      const newLeft = walk(left, target, sub => rebuild(node(p, axis, sub, right)));
      return node(p, axis, newLeft, right);
    }
    const newRight = walk(right, target, sub => rebuild(node(p, axis, left, sub)));
    return node(p, axis, left, newRight);
  }

  const finalTree = walk(tree, point, sub => sub);
  if (!steps.some(s => s.kind === "not_found")) {
    steps.push({
      kind: "found",
      visitedPoint: null,
      queryPoint: point,
      treeSnapshot: finalTree,
      message: `Remove complete — ${fmt(point)} deleted, all KD-tree invariants intact.`,
    });
  }
  return steps;
}

// ── FindMin ───────────────────────────────────────────────────────────────────

export function findMinSteps(tree: KDTree, searchAxis: number): Step[] {
  const steps: Step[] = [];

  function walk(node: KDTree, depth: number): Point | null {
    if (node.kind === "empty") return null;
    const { point: p, axis, left, right } = node;

    if (axis === searchAxis) {
      steps.push({
        kind: "visit",
        visitedPoint: p,
        axis,
        message:
          `At ${fmt(p)}: split axis ${axisLabel(axis)} = search axis ${axisLabel(searchAxis)} → ` +
          `PRUNE right subtree (every right value > pivot on ${axisLabel(searchAxis)})`,
      });
      const lm = walk(left, depth + 1);
      return lm === null || at(p, searchAxis) <= at(lm, searchAxis) ? p : lm;
    }

    steps.push({
      kind: "visit",
      visitedPoint: p,
      axis,
      message:
        `At ${fmt(p)}: split axis ${axisLabel(axis)} ≠ search axis ${axisLabel(searchAxis)} → ` +
        `must check BOTH subtrees`,
    });
    const lm = walk(left, depth + 1);
    const rm = walk(right, depth + 1);
    const cm =
      lm === null ? rm :
      rm === null ? lm :
      at(lm, searchAxis) <= at(rm, searchAxis) ? lm : rm;
    return cm === null || at(p, searchAxis) <= at(cm, searchAxis) ? p : cm;
  }

  const result = walk(tree, 0);
  if (result) {
    steps.push({
      kind: "found",
      visitedPoint: result,
      axis: searchAxis,
      message: `Minimum on ${axisLabel(searchAxis)}-axis is ${fmt(result)} (value = ${at(result, searchAxis)})`,
    });
  }
  return steps;
}

// ── Nearest Neighbor ──────────────────────────────────────────────────────────

export function nnSteps(tree: KDTree, target: Point): Step[] {
  const steps: Step[] = [];

  function walk(node: KDTree, best: Point | null, depth: number): Point | null {
    if (node.kind === "empty") return best;

    const { point: p, axis, left, right } = node;
    const newBest   = best === null || dSq(p, target) < dSq(best, target) ? p : best;
    const isNewBest = newBest !== best;

    steps.push({
      kind: "visit",
      visitedPoint: p,
      queryPoint: target,
      axis,
      bestSoFar: newBest,
      message:
        `Visit ${fmt(p)}, dist to target = ${Math.sqrt(dSq(p, target)).toFixed(2)}` +
        (isNewBest
          ? ` ← NEW best! (was ${best ? `${fmt(best)}, dist=${Math.sqrt(dSq(best, target)).toFixed(2)}` : "none"})`
          : ` (best still ${fmt(newBest)}, dist=${Math.sqrt(dSq(newBest, target)).toFixed(2)})`),
    });

    const goLeft    = at(target, axis) <= at(p, axis);
    const [near, far] = goLeft ? [left, right] : [right, left];

    const afterNear   = walk(near, newBest, depth + 1);
    const axisDistSq  = (at(target, axis) - at(p, axis)) ** 2;
    const bestDistSq  = afterNear === null ? Infinity : dSq(afterNear, target);
    const mustCheckFar = axisDistSq <= bestDistSq;

    if (!mustCheckFar) {
      steps.push({
        kind: "prune_subtree",
        visitedPoint: p,
        queryPoint: target,
        axis,
        bestSoFar: afterNear,
        message:
          `PRUNE far side: hyperplane dist² = ${axisDistSq.toFixed(2)} > best dist² = ${bestDistSq.toFixed(2)}. ` +
          `Nothing on the far side can be closer — skip entire subtree.`,
      });
      return afterNear;
    }

    steps.push({
      kind: "check_far",
      visitedPoint: p,
      queryPoint: target,
      axis,
      bestSoFar: afterNear,
      message:
        `Check far side: hyperplane dist² = ${axisDistSq.toFixed(2)} ≤ best dist² = ${bestDistSq.toFixed(2)}. ` +
        `Search circle crosses the hyperplane — must search far side too.`,
    });
    return walk(far, afterNear, depth + 1);
  }

  const result = walk(tree, null, 0);
  if (result) {
    steps.push({
      kind: "found",
      visitedPoint: result,
      queryPoint: target,
      message: `Nearest neighbor to ${fmt(target)} is ${fmt(result)}, distance = ${Math.sqrt(dSq(result, target)).toFixed(2)}`,
    });
  }
  return steps;
}

// ── Range Search ──────────────────────────────────────────────────────────────

export function rangeSteps(tree: KDTree, lower: Point, upper: Point): Step[] {
  const steps: Step[] = [];

  function inRange(p: Point) {
    return p.coords.every((v, i) => v >= lower.coords[i] && v <= upper.coords[i]);
  }

  function walk(node: KDTree, depth: number): void {
    if (node.kind === "empty") return;

    const { point: p, axis, left, right } = node;
    const pivotVal = at(p, axis);
    const lowerVal = at(lower, axis);
    const upperVal = at(upper, axis);
    const isIn     = inRange(p);

    steps.push({
      kind: isIn ? "in_range" : "visit",
      visitedPoint: p,
      axis,
      message:
        `At ${fmt(p)}: ${isIn ? "✓ inside query box" : "outside query box"}. ` +
        `Range on ${axisLabel(axis)}: [${lowerVal}, ${upperVal}], pivot = ${pivotVal}`,
    });

    const goLeft  = lowerVal <= pivotVal;
    const goRight = upperVal >= pivotVal;

    if (!goLeft) {
      steps.push({
        kind: "prune_left",
        visitedPoint: p,
        axis,
        message:
          `PRUNE left: lower[${axisLabel(axis)}] = ${lowerVal} > pivot = ${pivotVal}. ` +
          `All left values are ≤ ${pivotVal} < ${lowerVal} — none can be in the box.`,
      });
    } else {
      walk(left, depth + 1);
    }

    if (!goRight) {
      steps.push({
        kind: "prune_right",
        visitedPoint: p,
        axis,
        message:
          `PRUNE right: upper[${axisLabel(axis)}] = ${upperVal} < pivot = ${pivotVal}. ` +
          `All right values are ≥ ${pivotVal} > ${upperVal} — none can be in the box.`,
      });
    } else {
      walk(right, depth + 1);
    }
  }

  walk(tree, 0);
  return steps;
}
