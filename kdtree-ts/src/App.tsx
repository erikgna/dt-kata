import React, { useState } from "react";
import KDTreeCanvas from "./viz/KDTreeCanvas.js";
import Controls from "./viz/Controls.js";
import { useKDTree } from "./viz/useKDTree.js";
import type { Point } from "./kdtree.js";
import type { Operation } from "./viz/types.js";
import type { OperationParams } from "./viz/useKDTree.js";

export default function App() {
  const {
    tree, steps, stepIdx, playing, speed, setSpeed,
    applyOperation, loadClassic, clearTree, addRandom,
    nextStep, prevStep, play, pause, reset,
    currentStep, currentMessage,
  } = useKDTree();

  const [queryPoint, setQueryPoint] = useState<Point | null>(null);
  const [rangeBox,   setRangeBox]   = useState<{ lower: Point; upper: Point } | null>(null);

  function handleOperation(op: Operation, params: OperationParams) {
    if (params.point)  setQueryPoint(params.point);
    if (params.lower && params.upper) {
      setRangeBox({ lower: params.lower, upper: params.upper });
      setQueryPoint(null);
    } else {
      setRangeBox(null);
    }
    applyOperation(op, params);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", background: "#020617",
      fontFamily: "system-ui, -apple-system, sans-serif", color: "#e2e8f0",
    }}>
      {/* Header */}
      <header style={{
        padding: "10px 20px",
        borderBottom: "1px solid #0f172a",
        display: "flex", alignItems: "center", gap: 14,
        background: "#0a0f1e",
      }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
          KD-Tree Visualizer
        </h1>
        <span style={{ fontSize: 12, color: "#334155" }}>
          Use Insert to add points · Run to animate operations · Step through with ◀▶
        </span>
      </header>

      {/* Main layout */}
      <div style={{
        display: "flex", flex: 1, overflow: "hidden",
        padding: 16, gap: 14, alignItems: "flex-start",
      }}>
        {/* Canvas */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <KDTreeCanvas
            tree={tree}
            steps={steps}
            stepIdx={stepIdx}
            queryPoint={queryPoint}
            rangeBox={rangeBox}
          />
        </div>

        {/* Controls */}
        <div style={{ width: 290, flexShrink: 0, overflowY: "auto", maxHeight: "calc(100vh - 60px)" }}>
          <Controls
            onOperation={handleOperation}
            onLoadClassic={loadClassic}
            onAddRandom={() => addRandom(5)}
            onClear={() => { clearTree(); setQueryPoint(null); setRangeBox(null); }}
            speed={speed}
            onSpeedChange={setSpeed}
            playing={playing}
            onPlay={play}
            onPause={pause}
            onNextStep={nextStep}
            onPrevStep={prevStep}
            onReset={reset}
            stepIdx={stepIdx}
            totalSteps={steps.length}
            currentStep={currentStep}
            currentMessage={currentMessage}
          />
        </div>
      </div>
    </div>
  );
}
