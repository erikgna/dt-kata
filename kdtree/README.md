# K-Dimensional Tree — Scala 3 Kata

## What is a K-Dimensional Tree?

A K-D tree is a binary search tree that organizes points in **k-dimensional space**. Each internal node splits the space along one axis using that node's coordinate as the pivot. The axis rotates at every level: depth 0 splits on axis 0, depth 1 on axis 1, ..., depth k on axis 0 again.

```
Points: (3,6) (17,15) (13,15) (6,12) (9,1) (2,7) (10,19)

Split on x (axis 0) at root → median x = 9
        (9,1)
       /      \
    (3,6)    (13,15)
   /    \    /      \
(2,7)(6,12)(10,19)(17,15)
```

### Use cases

- **Nearest-neighbour search** — find the closest point to a query (robotics, ML, geo lookup)
- **Range search** — find all points within a bounding box (spatial databases, GIS)
- **Collision detection** — fast proximity queries in game engines and simulations
- **k-NN classification** — the backbone of many ML algorithms

### Pros and cons

| | |
|---|---|
| **Fast average queries** | O(log n) nearest-neighbour and O(√n + k) range search |
| **Works in any dimension** | Axis cycling generalises to arbitrary k |
| **Simple structure** | Plain binary tree — no rotations needed |
| **Balanced build** | Median-based construction gives O(n log² n) build time |
| **Degrades in high dimensions** | The "curse of dimensionality" makes pruning less effective above ~20 dims |
| **No rebalancing on insert** | Sequential inserts can produce unbalanced trees |

---

## Project structure

```
kdtree/
├── build.sbt
├── project/
│   └── build.properties
└── src/
    ├── main/scala/
    │   └── KDTree.scala        # Point, KDTree enum, all operations
    └── test/scala/
        └── KDTreeSpec.scala    # 19 ScalaTest specs
```

---

## Prerequisites

- [Coursier](https://get-coursier.io/) / `cs setup` (installs Scala + sbt)
- Java 11+

Verify:

```bash
scala --version   # Scala 3.x
sbt --version     # 1.x
```

---

## Run the tests

```bash
cd kdtree
sbt test
```

Expected output:

```
[info] KDTreeSpec:
[info] Point
[info] - should report correct dimensionality
[info] - should compute squared distance correctly
[info] - should reject empty coordinate vectors
[info] KDTree.build
[info] - should produce Empty for an empty input
[info] - should contain all inserted points after build
[info] - should not report a point that was never inserted
[info] KDTree.insert
[info] - should add a point to an empty tree
[info] - should handle inserting a duplicate without creating a second node
[info] - should build incrementally and match contains results
[info] KDTree.nearestNeighbor
[info] - should return None on an empty tree
[info] - should return the only point in a single-node tree
[info] - should find the exact point when it is in the tree
[info] - should find the closest point by Euclidean distance
[info] - should work correctly in 3D
[info] KDTree.rangeSearch
[info] - should return empty for an empty tree
[info] - should return all points when the range covers the whole space
[info] - should return no points when the range is empty
[info] - should return only points strictly inside the given range
[info] - should include boundary points (inclusive range)
[info] Tests: succeeded 19, failed 0
```

---

## Interactive use (sbt console)

```bash
cd kdtree
sbt console
```

```scala
import kdtree.*

val points = Seq(Point(3,6), Point(17,15), Point(6,12), Point(9,1))
val tree   = KDTree.build(points)

KDTree.contains(tree, Point(9,1))                        // true
KDTree.nearestNeighbor(tree, Point(10,10))               // Some(Point(...))
KDTree.rangeSearch(tree, Point(0,0), Point(10,10))       // points in that box
```

---

## API summary

```scala
// Construction
KDTree.build(points: Seq[Point]): KDTree   // balanced, O(n log² n)
KDTree.insert(tree, point): KDTree         // functional insert, O(log n) avg
KDTree.empty: KDTree                       // empty tree

// Queries
KDTree.contains(tree, point): Boolean              // exact lookup
KDTree.nearestNeighbor(tree, target): Option[Point]// closest point
KDTree.rangeSearch(tree, lower, upper): List[Point]// orthogonal range

// Point
Point(1.0, 2.0, 3.0)         // any number of dimensions
point.distanceSqTo(other)    // squared Euclidean distance
```
