import React, { useMemo } from "react";
import type { Point, KDTree } from "../kdtree.js";
import type { Step } from "./types.js";

const PAD_X   = 56;
const PAD_Y   = 56;
const LEVEL_H = 100;  // px between tree levels
const R       = 26;   // node radius

// ── Tree layout ────────────────────────────────────────────────────────────────
// In-order traversal index → X position (left subtree always left of parent)
// Depth → Y position

type LayoutNode = {
  point:  Point;
  axis:   number;
  ix:     number;      // in-order index (determines X)
  depth:  number;      // determines Y
  left:   LayoutNode | null;
  right:  LayoutNode | null;
};

function buildLayout(tree: KDTree): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let counter = 0;

  function assign(t: KDTree, depth: number): LayoutNode | null {
    if (t.kind === "empty") return null;
    const left  = assign(t.left,  depth + 1);
    const ix    = counter++;
    const right = assign(t.right, depth + 1);
    const node: LayoutNode = { point: t.point, axis: t.axis, ix, depth, left, right };
    nodes.push(node);
    return node;
  }

  assign(tree, 0);
  return nodes;
}

// ── Color helpers ──────────────────────────────────────────────────────────────

const ptEq = (a: Point, b: Point) =>
  a.coords.length === b.coords.length && a.coords.every((v, i) => v === b.coords[i]);

// Step outcome → fill color for active node
const KIND_COLOR: Partial<Record<string, string>> = {
  found:         "#16a34a",
  insert_here:   "#16a34a",
  in_range:      "#16a34a",
  not_found:     "#dc2626",
  prune_subtree: "#ea580c",
  prune_left:    "#ea580c",
  prune_right:   "#ea580c",
  successor:     "#9333ea",
};

// Axis-based default colors (when node is not highlighted)
//   axis 0 (X-split) = blue family
//   axis 1 (Y-split) = teal family
const AXIS_FILL: string[] = ["#1e3a5f", "#0f3d30", "#3b1a5f"];
const AXIS_RING: string[] = ["#3b82f6", "#22c55e", "#a855f7"];

function resolveColor(
  point: Point, steps: Step[], stepIdx: number, axisIdx: number,
): { fill: string; ring: string; isActive: boolean; wasVisited: boolean } {
  const cur = steps[stepIdx];
  if (cur?.visitedPoint && ptEq(point, cur.visitedPoint)) {
    const col = KIND_COLOR[cur.kind] ?? "#2563eb";
    return { fill: col, ring: col, isActive: true, wasVisited: false };
  }
  for (let i = 0; i < stepIdx; i++) {
    if (steps[i]?.visitedPoint && ptEq(point, steps[i].visitedPoint!)) {
      return { fill: "#1e3a5f", ring: "#60a5fa", isActive: false, wasVisited: true };
    }
  }
  return {
    fill: AXIS_FILL[axisIdx % AXIS_FILL.length],
    ring: AXIS_RING[axisIdx % AXIS_RING.length],
    isActive: false, wasVisited: false,
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  tree:        KDTree;
  steps:       Step[];
  stepIdx:     number;
  queryPoint?: Point | null;
  rangeBox?:   { lower: Point; upper: Point } | null;
  onCanvasClick?: (point: Point) => void;  // kept for API compat, unused in tree view
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function KDTreeCanvas({ tree, steps, stepIdx, queryPoint }: Props) {
  const nodes = useMemo(() => buildLayout(tree), [tree]);

  // Empty tree
  if (nodes.length === 0) {
    return (
      <svg width={520} height={180}
        style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", display: "block" }}>
        <text x={260} y={95} textAnchor="middle" fill="#334155" fontSize={14}>
          Empty tree — load points to begin
        </text>
      </svg>
    );
  }

  const maxIx    = Math.max(...nodes.map(n => n.ix), 0);
  const maxDepth = Math.max(...nodes.map(n => n.depth), 0);

  // Fit width to node count; minimum 520px
  const svgW = Math.max(520, (maxIx + 1) * 80 + PAD_X * 2);
  const svgH = (maxDepth + 1) * LEVEL_H + PAD_Y * 2;

  const toX = (ix: number) =>
    maxIx === 0 ? svgW / 2 : PAD_X + (ix / maxIx) * (svgW - PAD_X * 2);
  const toY = (depth: number) => PAD_Y + depth * LEVEL_H;

  // Distinct depths → level labels on right side
  const depths = [...new Set(nodes.map(n => n.depth))].sort((a, b) => a - b);

  // For insert_here: show a ghost node below the last visited parent
  const cur = steps[stepIdx];
  let ghostNode: { cx: number; cy: number } | null = null;
  if (cur?.kind === "insert_here" && stepIdx > 0) {
    const prev = steps[stepIdx - 1];
    if (prev?.visitedPoint && (prev.kind === "go_left" || prev.kind === "go_right")) {
      const parent = nodes.find(n => ptEq(n.point, prev.visitedPoint!));
      if (parent) {
        const isLeft = prev.kind === "go_left";
        // Put ghost between siblings or offset from parent
        const existingChild = isLeft ? parent.left : parent.right;
        if (!existingChild) {
          const ghostIx = isLeft ? parent.ix - 0.5 : parent.ix + 0.5;
          ghostNode = { cx: toX(ghostIx), cy: toY(parent.depth + 1) };
        }
      }
    }
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden" }}>
      <svg width={svgW} height={svgH}
        style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", display: "block" }}>

        {/* Level labels — axis name per depth, flush right */}
        {depths.map(d => {
          const axisIdx = d % 2;
          const axisLabel = ["← axis 0 (X)", "← axis 1 (Y)"][axisIdx] ?? `← axis ${axisIdx}`;
          return (
            <text key={d} x={svgW - 6} y={toY(d) + 5}
              textAnchor="end" fontSize={10} fill={AXIS_RING[axisIdx]} opacity={0.65}>
              {axisLabel}
            </text>
          );
        })}

        {/* Edges */}
        {nodes.flatMap((n, i) => {
          const px = toX(n.ix);
          const py = toY(n.depth);
          const out = [];
          if (n.left) {
            const cx = toX(n.left.ix);
            const cy = toY(n.left.depth);
            out.push(
              <line key={`eL${i}`}
                x1={px} y1={py + R} x2={cx} y2={cy - R}
                stroke="#1e293b" strokeWidth={2} />
            );
          }
          if (n.right) {
            const cx = toX(n.right.ix);
            const cy = toY(n.right.depth);
            out.push(
              <line key={`eR${i}`}
                x1={px} y1={py + R} x2={cx} y2={cy - R}
                stroke="#1e293b" strokeWidth={2} />
            );
          }
          return out;
        })}

        {/* Ghost edge to insert position */}
        {ghostNode && (() => {
          const parent = nodes.find(n => {
            const prev = steps[stepIdx - 1];
            return prev?.visitedPoint && ptEq(n.point, prev.visitedPoint!);
          });
          if (!parent) return null;
          return (
            <line
              x1={toX(parent.ix)} y1={toY(parent.depth) + R}
              x2={ghostNode.cx}   y2={ghostNode.cy - R}
              stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
          );
        })()}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const cx = toX(n.ix);
          const cy = toY(n.depth);
          const { fill, ring, isActive, wasVisited } = resolveColor(n.point, steps, stepIdx, n.axis);

          return (
            <g key={i}>
              {/* Pulse ring for active node */}
              {isActive && (
                <circle cx={cx} cy={cy} r={R + 12}
                  fill="none" stroke={ring} strokeWidth={1.5} opacity={0.3} />
              )}

              {/* Node circle */}
              <circle cx={cx} cy={cy} r={R}
                fill={fill}
                stroke={ring}
                strokeWidth={isActive ? 3 : wasVisited ? 2 : 1.5} />

              {/* Coordinate text inside node */}
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                fontSize={n.point.coords.length > 2 ? 9 : 11}
                fill="#e2e8f0"
                fontWeight={isActive ? "bold" : "normal"}>
                ({n.point.coords.join(", ")})
              </text>
            </g>
          );
        })}

        {/* Ghost node for insert_here */}
        {ghostNode && (
          <g>
            <circle cx={ghostNode.cx} cy={ghostNode.cy} r={R}
              fill="#052e16" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 4" />
            <text x={ghostNode.cx} y={ghostNode.cy} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fill="#22c55e">
              new
            </text>
          </g>
        )}

        {/* Query point label */}
        {queryPoint && (
          <text x={svgW / 2} y={svgH - 10} textAnchor="middle"
            fontSize={11} fill="#fbbf24">
            ◆ query: ({queryPoint.coords.join(", ")})
          </text>
        )}
      </svg>
    </div>
  );
}
