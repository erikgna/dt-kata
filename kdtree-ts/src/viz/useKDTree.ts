import { useState, useEffect, useRef, useCallback } from "react";
import { EMPTY, build, insert, remove, pt } from "../kdtree.js";
import type { KDTree, Point } from "../kdtree.js";
import type { Step, Operation } from "./types.js";
import {
  insertSteps,
  containsSteps,
  removeSteps,
  findMinSteps,
  nnSteps,
  rangeSteps,
} from "./stepGenerators.js";

const CLASSIC_POINTS = [
  pt(3, 6), pt(17, 15), pt(13, 15), pt(6, 12),
  pt(9, 1), pt(2, 7), pt(10, 19),
];

export type OperationParams = {
  point?: Point;
  lower?: Point;
  upper?: Point;
  axis?: number;
};

export function useKDTree() {
  const [tree,     setTree]     = useState<KDTree>(EMPTY);
  const [steps,    setSteps]    = useState<Step[]>([]);
  const [stepIdx,  setStepIdx]  = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [speed,    setSpeed]    = useState(800); // ms per step
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play: advance stepIdx on each tick
  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setStepIdx(i => {
        if (i >= steps.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, steps.length]);

  const applyOperation = useCallback((op: Operation, params: OperationParams) => {
    let newSteps: Step[] = [];
    let newTree: KDTree = tree;

    if (op === "insert" && params.point) {
      newSteps = insertSteps(tree, params.point);
      newTree  = insert(tree, params.point);
    } else if (op === "contains" && params.point) {
      newSteps = containsSteps(tree, params.point);
    } else if (op === "remove" && params.point) {
      newSteps = removeSteps(tree, params.point);
      newTree  = remove(tree, params.point);
    } else if (op === "findMin") {
      newSteps = findMinSteps(tree, params.axis ?? 0);
    } else if (op === "nearestNeighbor" && params.point) {
      newSteps = nnSteps(tree, params.point);
    } else if (op === "rangeSearch" && params.lower && params.upper) {
      newSteps = rangeSteps(tree, params.lower, params.upper);
    }

    setTree(newTree);
    setSteps(newSteps);
    setStepIdx(0);
    setPlaying(false);
  }, [tree]);

  const loadClassic = useCallback(() => {
    setTree(build(CLASSIC_POINTS));
    setSteps([]);
    setStepIdx(0);
    setPlaying(false);
  }, []);

  const clearTree = useCallback(() => {
    setTree(EMPTY);
    setSteps([]);
    setStepIdx(0);
    setPlaying(false);
  }, []);

  const addPoint = useCallback((point: Point) => {
    const s    = insertSteps(tree, point);
    const next = insert(tree, point);
    setTree(next);
    setSteps(s);
    setStepIdx(0);
    setPlaying(true);
  }, [tree]);

  const addRandom = useCallback((n = 5) => {
    let t = tree;
    for (let i = 0; i < n; i++) {
      t = insert(t, pt(
        Math.floor(Math.random() * 18) + 1,
        Math.floor(Math.random() * 18) + 1,
      ));
    }
    setTree(t);
    setSteps([]);
    setStepIdx(0);
    setPlaying(false);
  }, [tree]);

  const currentStep = steps[stepIdx];

  return {
    tree,
    // What canvases should draw: the snapshot recorded for the current step
    // (mutating ops change the tree only as you step), else the committed tree.
    displayTree: currentStep?.treeSnapshot ?? tree,
    steps,
    stepIdx,
    playing,
    speed,
    setSpeed,
    applyOperation,
    loadClassic,
    clearTree,
    addPoint,
    addRandom,
    nextStep: () => setStepIdx(i => Math.min(i + 1, steps.length - 1)),
    prevStep: () => setStepIdx(i => Math.max(i - 1, 0)),
    play:     () => setPlaying(true),
    pause:    () => setPlaying(false),
    reset:    () => { setStepIdx(0); setPlaying(false); },
    currentStep,
    currentMessage: currentStep?.message ?? "",
  };
}
