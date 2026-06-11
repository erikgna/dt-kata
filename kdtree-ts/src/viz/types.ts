import type { Point, KDTree } from "../kdtree.js";

export type StepKind =
  | "visit"          // arriving at a node, comparing
  | "go_left"        // decided to go left
  | "go_right"       // decided to go right
  | "found"          // exact match found
  | "not_found"      // hit empty — point absent
  | "insert_here"    // empty slot — placing new node here
  | "prune_subtree"  // NN: far subtree skipped
  | "check_far"      // NN: must search far subtree too
  | "in_range"       // rangeSearch: pivot is inside the query box
  | "prune_left"     // rangeSearch: left subtree pruned
  | "prune_right"    // rangeSearch: right subtree pruned
  | "successor";     // remove: showing the replacement node

export type Step = {
  kind: StepKind;
  visitedPoint: Point | null;  // which tree node we're at (null = empty slot)
  queryPoint?: Point;          // point being searched / inserted
  axis?: number;               // split axis at this node
  bestSoFar?: Point | null;    // NN: current best candidate
  treeSnapshot?: KDTree;       // tree state to display at this step (mutating ops)
  message: string;             // plain-English description shown in the UI
};

export type BoundingBox = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type NodeInfo = {
  point: Point;
  axis: number;
  bbox: BoundingBox;
  left: NodeInfo | null;
  right: NodeInfo | null;
};

export type Operation =
  | "insert"
  | "contains"
  | "remove"
  | "findMin"
  | "nearestNeighbor"
  | "rangeSearch";
