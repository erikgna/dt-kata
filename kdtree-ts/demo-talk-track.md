# KD-Tree Visualizer — 2:00 Demo Script

**Target: 120 seconds.** Read the bold lines aloud. Bracketed lines are click cues.
Word count ~300. Pace ~150 wpm. Practice once with a timer.

The tree only changes as you step — nothing happens until you press ▶▶.
Use ▶▶ / ◀◀ to drive every operation manually; ▶ auto-plays at the slider speed.

---

## [0:00 – 0:15] What a KD-tree is

*[Click **Load 7-pt classic**.]*

> **A KD-tree is a binary tree that partitions space. Each node splits along one axis, alternating by depth — X, then Y, then X again.**

> **Left is the actual 2D space, with dashed splitting planes. Right is the same tree as a graph. They stay in sync on every step.**

---

## [0:15 – 0:35] Insert

*[Select **Insert** (5, 10), Run, step with ▶▶.]*

> **Insert walks down from the root. At an X node it compares X, at a Y node it compares Y — smaller-or-equal goes left, bigger goes right — until it hits an empty slot. The dashed ghost shows where it lands, and only the final step commits it.**

---

## [0:35 – 0:55] Find Min

*[Select **Find Min**, axis X, Run, step through.]*

> **Find Min returns the smallest value on one axis. When a node splits on that same axis, the whole right side is pruned. When it splits on the other axis, both sides must be checked — that's the cost of alternating axes.**

---

## [0:55 – 1:35] Remove — the hard one

*[Select **Remove** (2, 7), Run, step through slowly.]*

> **Remove is where KD-trees get interesting. We find the node — but it has children, so we can't just drop it.**

> **Watch the steps: it runs Find Min inside the right subtree to pick a successor, copies it up — for a moment the point exists twice — then recursively deletes the duplicate below. The final step shows the rebuilt tree, invariants intact.**

---

## [1:35 – 1:55] Range Search and Nearest Neighbor

*[Select **Range Search**, Run. Then **Nearest Neighbor**, Run.]*

> **Range Search collects every point inside the yellow box — green is inside, orange subtrees are pruned because their region can't intersect the box.**

> **Nearest Neighbor dives toward the target, then backtracks, searching the far side only when the splitting plane is closer than the current best.**

---

## [1:55 – 2:00] Close

> **Every step is recorded — play, pause, or scrub backward through any traversal. That's the whole structure in two minutes.**




## REMOVE
Can't just drop it, need to replace it with the minimum from the right subtree. (Y axis this case)
findMin(Y) (5, 10) has smallest Y value in the right subtree.
Copy (5, 10) into the deleted node's slot.
Everything else is the same, since we only have (6, 12) in the right subtree.

## MIN (Y)
Since it's Y axis, we need to check both sides, because first split is on X axis.
We check (2,7) and go to left, then (3,6).

Start again, check (17,15)