import React, { useMemo } from "react";
import type { Point, KDTree } from "../kdtree.js";
import type { Step } from "./types.js";

const PAD    = 36;
const POINT_R = 7;

const ptEq = (a: Point, b: Point) =>
  a.coords.length === b.coords.length && a.coords.every((v, i) => v === b.coords[i]);

function collectPoints(tree: KDTree, acc: Point[] = []): Point[] {
  if (tree.kind === "empty") return acc;
  acc.push(tree.point);
  collectPoints(tree.left, acc);
  collectPoints(tree.right, acc);
  return acc;
}

type BBox = { xMin: number; xMax: number; yMin: number; yMax: number };
type Partition = { point: Point; axis: number; bbox: BBox };

function computePartitions(tree: KDTree): Partition[] {
  const result: Partition[] = [];
  function walk(node: KDTree, xMin: number, xMax: number, yMin: number, yMax: number) {
    if (node.kind === "empty") return;
    const { point, axis, left, right } = node;
    const px = point.coords[0];
    const py = point.coords[1];
    result.push({ point, axis, bbox: { xMin, xMax, yMin, yMax } });
    if (axis === 0) {
      walk(left,  xMin, px,   yMin, yMax);
      walk(right, px,   xMax, yMin, yMax);
    } else {
      walk(left,  xMin, xMax, yMin, py);
      walk(right, xMin, xMax, py,   yMax);
    }
  }
  walk(tree, -Infinity, Infinity, -Infinity, Infinity);
  return result;
}

interface Props {
  tree:       KDTree;
  steps:      Step[];
  stepIdx:    number;
  queryPoint?: Point | null;
  rangeBox?:   { lower: Point; upper: Point } | null;
}

const AXIS_STROKE = ["#3b82f6", "#22c55e"];

const KIND_COLORS: Partial<Record<string, { fill: string; stroke: string }>> = {
  found:         { fill: "#15803d", stroke: "#22c55e" },
  insert_here:   { fill: "#15803d", stroke: "#22c55e" },
  in_range:      { fill: "#15803d", stroke: "#22c55e" },
  not_found:     { fill: "#991b1b", stroke: "#ef4444" },
  prune_subtree: { fill: "#9a3412", stroke: "#f97316" },
  prune_left:    { fill: "#9a3412", stroke: "#f97316" },
  prune_right:   { fill: "#9a3412", stroke: "#f97316" },
  successor:     { fill: "#6b21a8", stroke: "#a855f7" },
  visit:         { fill: "#1d4ed8", stroke: "#3b82f6" },
  go_left:       { fill: "#1d4ed8", stroke: "#3b82f6" },
  go_right:      { fill: "#1d4ed8", stroke: "#3b82f6" },
  check_far:     { fill: "#1e3a8a", stroke: "#60a5fa" },
};

export default function SpatialCanvas({ tree, steps, stepIdx, queryPoint, rangeBox }: Props) {
  const W = 380, H = 380;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points    = useMemo(() => collectPoints(tree), [tree]);
  const partitions = useMemo(() => computePartitions(tree), [tree]);

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const all: Point[] = [...points];
    if (queryPoint) all.push(queryPoint);
    if (rangeBox)   all.push(rangeBox.lower, rangeBox.upper);
    if (all.length === 0) return { xMin: 0, xMax: 20, yMin: 0, yMax: 20 };
    const xs = all.map(p => p.coords[0]);
    const ys = all.map(p => p.coords[1]);
    const m  = 2;
    return {
      xMin: Math.min(...xs) - m,
      xMax: Math.max(...xs) + m,
      yMin: Math.min(...ys) - m,
      yMax: Math.max(...ys) + m,
    };
  }, [points, queryPoint, rangeBox]);

  const rx = xMax - xMin || 1;
  const ry = yMax - yMin || 1;

  const toX  = (x: number) => PAD + ((x - xMin) / rx) * innerW;
  const toY  = (y: number) => H - PAD - ((y - yMin) / ry) * innerH;
  const capX = (x: number) => Math.max(PAD, Math.min(W - PAD, toX(x)));
  const capY = (y: number) => Math.max(PAD, Math.min(H - PAD, toY(y)));

  if (points.length === 0) {
    return (
      <svg width={W} height={H}
        style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", display: "block" }}>
        <text x={W/2} y={H/2} textAnchor="middle" fill="#334155" fontSize={13}>
          Spatial View — add points to begin
        </text>
      </svg>
    );
  }

  const cur         = steps[stepIdx];
  const visitedSet  = new Set(
    steps.slice(0, stepIdx)
      .filter(s => s.visitedPoint)
      .map(s => JSON.stringify(s.visitedPoint!.coords)),
  );

  const curPartition = cur?.visitedPoint
    ? partitions.find(p => ptEq(p.point, cur.visitedPoint!))
    : null;

  return (
    <svg width={W} height={H}
      style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", display: "block" }}>

      <text x={PAD} y={PAD - 10} fontSize={10} fill="#475569" letterSpacing={0.5}>SPATIAL VIEW</text>

      {/* Data area border */}
      <rect x={PAD} y={PAD} width={innerW} height={innerH}
        fill="none" stroke="#1e293b" strokeWidth={1} />

      {/* Partition lines */}
      {partitions.map((part, i) => {
        const px    = part.point.coords[0];
        const py    = part.point.coords[1];
        const color = AXIS_STROKE[part.axis % 2];
        if (part.axis === 0) {
          const sx  = toX(px);
          const sy1 = part.bbox.yMax === Infinity  ? PAD      : capY(part.bbox.yMax);
          const sy2 = part.bbox.yMin === -Infinity ? H - PAD  : capY(part.bbox.yMin);
          return <line key={i} x1={sx} y1={sy1} x2={sx} y2={sy2}
            stroke={color} strokeWidth={1} opacity={0.22} strokeDasharray="4 3" />;
        } else {
          const sy  = toY(py);
          const sx1 = part.bbox.xMin === -Infinity ? PAD      : capX(part.bbox.xMin);
          const sx2 = part.bbox.xMax === Infinity  ? W - PAD  : capX(part.bbox.xMax);
          return <line key={i} x1={sx1} y1={sy} x2={sx2} y2={sy}
            stroke={color} strokeWidth={1} opacity={0.22} strokeDasharray="4 3" />;
        }
      })}

      {/* Current node's partition bbox (shows which region we're searching) */}
      {curPartition && (() => {
        const { bbox, axis } = curPartition;
        const bx1 = bbox.xMin === -Infinity ? PAD     : capX(bbox.xMin);
        const bx2 = bbox.xMax === Infinity  ? W - PAD : capX(bbox.xMax);
        const by1 = bbox.yMax === Infinity  ? PAD     : capY(bbox.yMax);
        const by2 = bbox.yMin === -Infinity ? H - PAD : capY(bbox.yMin);
        const color = AXIS_STROKE[axis % 2];
        return (
          <rect x={Math.min(bx1,bx2)} y={Math.min(by1,by2)}
            width={Math.abs(bx2 - bx1)} height={Math.abs(by2 - by1)}
            fill={color + "1a"} stroke={color} strokeWidth={1.5} opacity={0.75} rx={2} />
        );
      })()}

      {/* Range query box */}
      {rangeBox && (() => {
        const rx1 = capX(rangeBox.lower.coords[0]);
        const rx2 = capX(rangeBox.upper.coords[0]);
        const ry1 = capY(rangeBox.upper.coords[1]);
        const ry2 = capY(rangeBox.lower.coords[1]);
        return (
          <rect x={Math.min(rx1,rx2)} y={Math.min(ry1,ry2)}
            width={Math.abs(rx2 - rx1)} height={Math.abs(ry2 - ry1)}
            fill="#fbbf2418" stroke="#fbbf24" strokeWidth={2}
            strokeDasharray="7 4" rx={3} />
        );
      })()}

      {/* Points */}
      {points.map((p, i) => {
        const cx = toX(p.coords[0]);
        const cy = toY(p.coords[1]);
        const isActive   = cur?.visitedPoint ? ptEq(p, cur.visitedPoint) : false;
        const wasVisited = !isActive && visitedSet.has(JSON.stringify(p.coords));
        const kc         = isActive ? (KIND_COLORS[cur!.kind] ?? KIND_COLORS["visit"]!) : null;
        const fill   = isActive ? kc!.fill   : wasVisited ? "#1e3a5f" : "#0c1a2e";
        const stroke = isActive ? kc!.stroke  : wasVisited ? "#60a5fa" : "#334155";

        return (
          <g key={i}>
            {isActive && (
              <circle cx={cx} cy={cy} r={POINT_R + 10}
                fill="none" stroke={stroke} strokeWidth={1.5} opacity={0.3} />
            )}
            <circle cx={cx} cy={cy} r={POINT_R}
              fill={fill} stroke={stroke} strokeWidth={isActive ? 2.5 : wasVisited ? 2 : 1.5} />
            <text x={cx + POINT_R + 3} y={cy + 4} fontSize={9} fill="#475569">
              ({p.coords[0]},{p.coords[1]})
            </text>
          </g>
        );
      })}

      {/* Query point ◆ */}
      {queryPoint && (() => {
        const qx = toX(queryPoint.coords[0]);
        const qy = toY(queryPoint.coords[1]);
        return (
          <g>
            <polygon
              points={`${qx},${qy-9} ${qx+7},${qy} ${qx},${qy+9} ${qx-7},${qy}`}
              fill="#fbbf24" />
            <text x={qx + 11} y={qy + 4} fontSize={9} fill="#fbbf24">
              ({queryPoint.coords[0]},{queryPoint.coords[1]})
            </text>
          </g>
        );
      })()}

      {/* Axis labels */}
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={10} fill="#334155">X</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="#334155"
        transform={`rotate(-90, 10, ${H / 2})`}>Y</text>
    </svg>
  );
}
