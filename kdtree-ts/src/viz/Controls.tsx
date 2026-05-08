import React, { useState } from "react";
import { pt } from "../kdtree.js";
import type { Point } from "../kdtree.js";
import type { Step, Operation } from "./types.js";
import type { OperationParams } from "./useKDTree.js";

interface Props {
  onOperation:   (op: Operation, params: OperationParams) => void;
  onLoadClassic: () => void;
  onAddRandom:   () => void;
  onClear:       () => void;
  speed:         number;
  onSpeedChange: (s: number) => void;
  playing:       boolean;
  onPlay:        () => void;
  onPause:       () => void;
  onNextStep:    () => void;
  onPrevStep:    () => void;
  onReset:       () => void;
  stepIdx:       number;
  totalSteps:    number;
  currentStep:   Step | undefined;
  currentMessage: string;
}

const KIND_COLOR: Partial<Record<string, string>> = {
  found:         "#22c55e",
  insert_here:   "#22c55e",
  in_range:      "#22c55e",
  not_found:     "#ef4444",
  prune_subtree: "#f97316",
  prune_left:    "#f97316",
  prune_right:   "#f97316",
  successor:     "#a855f7",
  visit:         "#3b82f6",
  go_left:       "#3b82f6",
  go_right:      "#3b82f6",
  check_far:     "#60a5fa",
};

export default function Controls({
  onOperation, onLoadClassic, onAddRandom, onClear,
  speed, onSpeedChange,
  playing, onPlay, onPause, onNextStep, onPrevStep, onReset,
  stepIdx, totalSteps, currentStep, currentMessage,
}: Props) {
  const [op,  setOp]  = useState<Operation>("insert");
  const [x,   setX]   = useState("5");
  const [y,   setY]   = useState("10");
  const [lx,  setLx]  = useState("3");
  const [ly,  setLy]  = useState("3");
  const [ux,  setUx]  = useState("14");
  const [uy,  setUy]  = useState("16");
  const [axis, setAxis] = useState(0);

  function handleRun() {
    if (op === "rangeSearch") {
      onOperation(op, {
        lower: pt(parseFloat(lx), parseFloat(ly)),
        upper: pt(parseFloat(ux), parseFloat(uy)),
      });
    } else if (op === "findMin") {
      onOperation(op, { axis });
    } else {
      onOperation(op, { point: pt(parseFloat(x), parseFloat(y)) });
    }
  }

  const msgColor = currentStep ? (KIND_COLOR[currentStep.kind] ?? "#6b7280") : "#6b7280";

  return (
    <div style={panel}>
      {/* ── Tree actions ── */}
      <Section label="Tree">
        <div style={row}>
          <Btn color="#3b82f6" onClick={onLoadClassic}>Load 7-pt classic</Btn>
          <Btn color="#6366f1" onClick={onAddRandom}>+5 random</Btn>
          <Btn color="#ef4444" onClick={onClear}>Clear</Btn>
        </div>
      </Section>

      {/* ── Operation ── */}
      <Section label="Operation">
        <select value={op} onChange={e => setOp(e.target.value as Operation)} style={selectStyle}>
          <option value="insert">Insert</option>
          <option value="contains">Contains</option>
          <option value="remove">Remove</option>
          <option value="findMin">Find Min</option>
          <option value="nearestNeighbor">Nearest Neighbor</option>
          <option value="rangeSearch">Range Search</option>
        </select>

        {op !== "findMin" && op !== "rangeSearch" && (
          <div style={{ ...row, marginTop: 8 }}>
            <Label>X</Label>
            <input value={x} onChange={e => setX(e.target.value)} type="number" style={numInput} />
            <Label>Y</Label>
            <input value={y} onChange={e => setY(e.target.value)} type="number" style={numInput} />
          </div>
        )}

        {op === "findMin" && (
          <div style={{ ...row, marginTop: 8 }}>
            <Label>Axis</Label>
            <select value={axis} onChange={e => setAxis(parseInt(e.target.value))} style={{ ...selectStyle, width: "auto" }}>
              <option value={0}>X (0)</option>
              <option value={1}>Y (1)</option>
            </select>
          </div>
        )}

        {op === "rangeSearch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <div style={row}>
              <span style={{ ...labelStyle, width: 36 }}>lower</span>
              <Label>X</Label>
              <input value={lx} onChange={e => setLx(e.target.value)} type="number" style={numInput} />
              <Label>Y</Label>
              <input value={ly} onChange={e => setLy(e.target.value)} type="number" style={numInput} />
            </div>
            <div style={row}>
              <span style={{ ...labelStyle, width: 36 }}>upper</span>
              <Label>X</Label>
              <input value={ux} onChange={e => setUx(e.target.value)} type="number" style={numInput} />
              <Label>Y</Label>
              <input value={uy} onChange={e => setUy(e.target.value)} type="number" style={numInput} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <Btn color="#22c55e" onClick={handleRun}>▶  Run</Btn>
        </div>
      </Section>

      {/* ── Playback ── */}
      <Section label="Playback">
        <div style={row}>
          <Btn color="#374151" onClick={onPrevStep} title="Step back">◀◀</Btn>
          <Btn color="#374151" onClick={playing ? onPause : onPlay}>{playing ? "⏸" : "▶"}</Btn>
          <Btn color="#374151" onClick={onNextStep} title="Step forward">▶▶</Btn>
          <Btn color="#374151" onClick={onReset} title="Reset to start">↩</Btn>
        </div>

        <div style={{ ...row, marginTop: 8 }}>
          <Label>Slow</Label>
          <input
            type="range" min={100} max={2000} step={50}
            value={2100 - speed}                       // invert: right = fast
            onChange={e => onSpeedChange(2100 - parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <Label>Fast</Label>
        </div>

        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          Step {totalSteps > 0 ? stepIdx + 1 : 0} / {totalSteps}
        </div>
      </Section>

      {/* ── Step message ── */}
      {currentMessage && (
        <Section label="What's happening">
          <div style={{
            borderLeft: `3px solid ${msgColor}`,
            paddingLeft: 10,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#cbd5e1",
          }}>
            {currentMessage}
          </div>
        </Section>
      )}

      {/* ── Legend ── */}
      <Section label="Legend">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            ["#3b82f6", "Visiting / comparing"],
            ["#60a5fa", "Already visited (path)"],
            ["#22c55e", "Found / inserted / in-range"],
            ["#ef4444", "Not found"],
            ["#f97316", "Pruned (skipped)"],
            ["#a855f7", "Successor (remove)"],
            ["#fbbf24", "Query point ◆"],
          ].map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#334155", marginTop: 4, borderTop: "1px solid #1e293b", paddingTop: 4 }}>
            Dashed lines = splitting hyperplanes<br />
            Click canvas to insert a point
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={labelStyle}>{children}</span>;
}

function Btn({ color, onClick, children, title }: {
  color: string; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      background: color, color: "#fff", border: "none", borderRadius: 5,
      padding: "5px 11px", cursor: "pointer", fontSize: 12, fontWeight: 500,
    }}>
      {children}
    </button>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 16,
  background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 10, padding: 16, color: "#e2e8f0",
  fontFamily: "system-ui, sans-serif", fontSize: 13,
};

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#64748b",
};

const selectStyle: React.CSSProperties = {
  background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155",
  borderRadius: 5, padding: "4px 8px", width: "100%",
};

const numInput: React.CSSProperties = {
  background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155",
  borderRadius: 5, padding: "4px 6px", width: 58,
};
