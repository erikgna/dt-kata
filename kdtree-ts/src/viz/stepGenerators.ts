import type { Point, KDTree } from "../kdtree.js";
import type { Step } from "./types.js";

// ── Internal helpers (mirror kdtree.ts logic without console.log) ─────────────

const axisLabel = (a: number) => ["X", "Y", "Z"][a] ?? `axis${a}`;
const fmt       = (p: Point) => `(${p.coords.join(", ")})`;
const at        = (p: Point, a: number) => p.coords[a];
const eq        = (a: Point, b: Point) =>
  a.coords.length === b.coords.length && a.coords.every((v, i) => v === b.coords[i]);
const dSq       = (a: Point, b: Point) =>
  a.coords.reduce((s, v, i) => s + (v - b.coords[i]) ** 2, 0);

// ── Insert ────────────────────────────────────────────────────────────────────

export function insertSteps(tree: KDTree, point: Point): Step[] {
  const steps: Step[] = [];

  function walk(node: KDTree, depth: number): void {
    if (node.kind === "empty") {
      const axis = depth % point.coords.length;
      steps.push({
        kind: "insert_here",
        visitedPoint: null,
        queryPoint: point,
        axis,
        message: `Empty slot at depth ${depth} — inserting ${fmt(point)} here (split will be on ${axisLabel(axis)})`,
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
      message:
        `At ${fmt(p)}, split on ${axisLabel(axis)}: ` +
        `${fmt(point)}[${axisLabel(axis)}] = ${at(point, axis)} ` +
        `${goLeft ? "≤" : ">"} pivot ${at(p, axis)} → go ${goLeft ? "LEFT" : "RIGHT"}`,
    });
    walk(goLeft ? left : right, depth + 1);
  }

  walk(tree, 0);
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

  function walk(node: KDTree, depth: number): void {
    if (node.kind === "empty") {
      steps.push({
        kind: "not_found",
        visitedPoint: null,
        queryPoint: point,
        message: `${fmt(point)} not found in the tree — nothing to remove`,
      });
      return;
    }
    const { point: p, axis, left, right } = node;
    if (eq(p, point)) {
      if (right.kind !== "empty") {
        const succ = findMinPoint(right, axis);
        steps.push({
          kind: "successor",
          visitedPoint: p,
          queryPoint: point,
          axis,
          message:
            `Found ${fmt(p)} — has right subtree. ` +
            `Successor = min on ${axisLabel(axis)} from right = ${succ ? fmt(succ) : "?"}. ` +
            `Replace this node with successor, then delete successor from right.`,
        });
      } else if (left.kind !== "empty") {
        const succ = findMinPoint(left, axis);
        steps.push({
          kind: "successor",
          visitedPoint: p,
          queryPoint: point,
          axis,
          message:
            `Found ${fmt(p)} — only left subtree. ` +
            `Successor = min on ${axisLabel(axis)} from left = ${succ ? fmt(succ) : "?"}. ` +
            `Move entire left subtree to right slot (keeps invariant).`,
        });
      } else {
        steps.push({
          kind: "found",
          visitedPoint: p,
          queryPoint: point,
          axis,
          message: `Found ${fmt(p)} — it is a leaf node (no children). Removing it.`,
        });
      }
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

function findMinPoint(tree: KDTree, searchAxis: number): Point | null {
  if (tree.kind === "empty") return null;
  const { point: p, axis, left, right } = tree;
  const minOf = (a: Point, b: Point | null) =>
    b === null || at(a, searchAxis) <= at(b, searchAxis) ? a : b;
  if (axis === searchAxis) return minOf(p, findMinPoint(left, searchAxis));
  const lm = findMinPoint(left, searchAxis);
  const rm = findMinPoint(right, searchAxis);
  const cm =
    lm === null ? rm :
    rm === null ? lm :
    at(lm, searchAxis) <= at(rm, searchAxis) ? lm : rm;
  return minOf(p, cm);
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
