# KD-Tree — Explained in Plain English

No code knowledge required. Every concept is explained with analogies and
step-by-step examples using real numbers from our dataset.

---

## What problem does a KD-Tree solve?

Imagine you have a city map with thousands of coffee shops marked on it.
A friend calls you and says "I'm at coordinates (10, 12) — what's the
nearest coffee shop?"

The dumb approach: check every single coffee shop, measure the distance,
keep the smallest. That works, but if there are a million coffee shops it
takes forever.

The KD-Tree approach: organize the coffee shops in advance so that when
someone asks "what's nearest to me?", you can skip most of them
immediately — the same way a phone book lets you skip most names by going
straight to the right letter.

---

## What is a Point?

A Point is just a location described by numbers.

- In 2D (a flat map): a point is two numbers — (x, y). Example: (3, 6).
- In 3D (a building): a point is three numbers — (x, y, z). Example: (1, 2, 5).
- In kD (abstract space): a point is k numbers.

We will use these 7 points throughout all the examples below:

```
(3,6)  (17,15)  (13,15)  (6,12)  (9,1)  (2,7)  (10,19)
```

Think of them as 7 coffee shops on a flat city map where x = how far east
and y = how far north.

---

## What is a "dimension" or "axis"?

An axis is just one of the directions you can measure.

- Axis 0 = the x direction (east/west).
- Axis 1 = the y direction (north/south).
- In 3D, axis 2 = the z direction (up/down).

When we say "compare on axis 0", we mean "look only at the first number".
When we say "compare on axis 1", we mean "look only at the second number".

---

## What is the tree structure?

A tree in programming is like a family tree, but upside down. It starts
at one point at the top (called the root) and branches downward.

Each spot in the tree is called a node. A node can be one of two things:

  EMPTY
    A dead end. Nothing here. Like a branch of a family tree that has
    no children.

  NODE
    Contains:
    - A point (the "pivot" — like the ancestor at that branch).
    - An axis (which direction was used to split at this level).
    - A LEFT branch (for points that went left at this split).
    - A RIGHT branch (for points that went right at this split).

The key rule at every node:
  Every point in the LEFT branch has a SMALLER-OR-EQUAL value on this
  node's axis than the pivot.
  Every point in the RIGHT branch has a LARGER value on this node's axis.

This rule is what makes searching fast — it lets you skip entire branches.

---

## BUILD — Organizing all points into the tree

Goal: take a messy pile of points and arrange them into a tree so that
searches are fast later.

Step-by-step walkthrough with our 7 points:

### Step 1 — Pick an axis to split on.

At depth 0 (the top level), we use axis 0 (the x direction).
At depth 1, we use axis 1 (the y direction).
At depth 2, we use axis 0 again.
We keep cycling. This is the "k-dimensional" part of the name.

Why cycle? Because if we always split on x, we'd only organize
things east/west and never north/south. Cycling through all axes
organizes the space in every direction.

### Step 2 — Sort the points on axis 0 (x).

Our 7 points sorted by x:
  (2,7)  (3,6)  (6,12)  (9,1)  (10,19)  (13,15)  (17,15)

### Step 3 — Pick the middle point as the pivot.

7 points → middle index is 3 → the pivot is (9,1).

This point goes at the ROOT of the tree. It splits the entire map
into "x ≤ 9" (left) and "x > 9" (right).

```
              (9,1)           ← root, splits on x
             /     \
    [left side]   [right side]
    x ≤ 9          x > 9
```

### Step 4 — Recurse on each half.

Left side (x ≤ 9): (2,7)  (3,6)  (6,12)
Right side (x > 9): (10,19)  (13,15)  (17,15)

Now we go one level deeper, so we switch to axis 1 (y).

Left side — sort by y:
  (3,6)  (2,7)  (6,12)
  Middle → pivot is (2,7). Splits left side into y ≤ 7 and y > 7.

Right side — sort by y:
  (10,19)  (13,15)  (17,15)
  Middle → pivot is (13,15). Splits right side into y ≤ 15 and y > 15.

```
                 (9,1)              ← axis 0 (x)
                /     \
            (2,7)     (13,15)      ← axis 1 (y)
           /    \     /     \
        (3,6) (6,12)(10,19)(17,15) ← axis 0 (x) again
```

Why is the median the best choice for pivot?
Because it splits the points as evenly as possible. An even split means
the tree stays balanced — roughly the same depth on both sides.
An unbalanced tree is like a filing cabinet where one drawer has 1000
folders and the other has 1. All the work still ends up in one place.

---

## INSERT — Adding one new point to an existing tree

Goal: place a new point in the correct position without rebuilding the whole tree.

Example: insert (5, 4) into the tree above.

Start at the root (9,1), which splits on axis 0 (x).
  5 ≤ 9 → go LEFT.

Now at (2,7), which splits on axis 1 (y).
  4 ≤ 7 → go LEFT.

Now at (3,6), which splits on axis 0 (x).
  5 > 3 → go RIGHT.

Now we hit EMPTY — this is where (5,4) belongs. Place it here.

The new point never moves the existing points. It just finds the first
empty slot that matches all the left/right decisions on the way down.

Downside of insert: if you insert points in an unlucky order, the tree
can become lopsided (like always going right). That makes searches slow.
If you insert a lot, it's better to rebuild the whole tree with build().

---

## CONTAINS — Checking if a point is in the tree

Goal: yes/no — is a specific point in the tree?

Example: is (6, 12) in the tree?

Start at root (9,1), axis 0.
  6 ≤ 9 → go LEFT.

At (2,7), axis 1.
  12 > 7 → go RIGHT.

At (6,12). Does (6,12) == (6,12)? YES → return true.

Example: is (5, 5) in the tree?

Start at root (9,1), axis 0.
  5 ≤ 9 → go LEFT.

At (2,7), axis 1.
  5 ≤ 7 → go LEFT.

At (3,6), axis 0.
  5 > 3 → go RIGHT.

Hit EMPTY → the point is not in the tree → return false.

This is fast because at every node we eliminate half the remaining
tree from consideration. With 1 million points, you make only about
20 decisions — like guessing a number between 1 and 1,000,000 by
repeatedly asking "higher or lower?"

---

## FIND MINIMUM — Finding the point with the smallest value on one axis

Goal: which point has the smallest x? Or smallest y?

This is harder than it sounds in a KD-tree, because the tree is not
sorted the same way at every level.

Two situations:

### Situation A — The current node splits on the SAME axis we're searching.

Example: looking for minimum x, and the current node splits on x.

The BST rule applies here: everything in the right subtree has x > pivot.
So we can SKIP the right subtree entirely.
We only need to look in: LEFT subtree + the current pivot.

### Situation B — The current node splits on a DIFFERENT axis.

Example: looking for minimum x, but the current node splits on y.

The split-on-y rule tells us nothing about x values.
Points on the left side (small y) can have any x.
Points on the right side (large y) can also have any x.
We must check BOTH subtrees and the current pivot.

Why does this matter?
Minimum is used inside the remove() operation. Without it, deletion
would be much more complicated.

---

## REMOVE — Deleting a point from the tree

Goal: take a specific point out of the tree while keeping the tree valid.

This is the trickiest operation. In a normal sorted list, deletion is
easy — just remove the item and shift everything over. In a KD-tree, we
can't do that because the structure depends on the exact position of each
pivot.

The strategy: when we delete a node, we replace it with another point
that is safe to put there, instead of leaving a hole.

### Case 1 — The node to delete is a LEAF (has no children).

A leaf is a node with no points below it. Just remove it. Nothing to
fix.

```
Before:       (9,1)          After:        (9,1)
             /     \                      /     \
          (2,7)   (13,15)             (2,7)   (13,15)
         /    \                      /
      (3,6) (6,12)               (3,6)     ← (6,12) was deleted
```

### Case 2 — The node to delete HAS a right subtree.

We need a replacement. Requirements for a valid replacement:
  - It must be ≥ everything in the left subtree (on this axis).
  - It must be ≤ everything remaining in the right subtree (on this axis).

The perfect candidate: the MINIMUM of the right subtree on this axis.

Why? It's already in the right subtree, so it's ≥ the left. And since
it's the minimum of the right side, everything else in the right subtree
is still ≥ it. So after we move it up, the rule still holds.

Steps:
  1. Find the minimum of the right subtree on this node's axis.
  2. Copy that minimum up to the current position.
  3. Delete that minimum from the right subtree (recursively).

### Case 3 — The node to delete has ONLY a left subtree (no right child).

We can't just move the left subtree up, because the tree's rule says:
  - Left subtree = values ≤ current pivot.
  - Right subtree = values > current pivot.

If we moved the left subtree to the current position and left the right
empty, the relationship would break.

Solution: find the minimum of the LEFT subtree on this axis, promote it
to the current position, then move the ENTIRE left subtree to the RIGHT
slot. The minimum we just promoted is now the new dividing line, and
everything below it (the old left subtree, now in the right slot) is
≥ it on this axis.

This feels backwards but it preserves the rule. Think of it like this:
you want to remove the captain of a team. If the assistant captain is
promoted to captain, all the other players (previously "below" the
assistant) are now "below" the new captain too. Same hierarchy, just
shifted up one step.

---

## NEAREST NEIGHBOR — Finding the closest point to a target

Goal: given a new location, find which existing point is closest to it.

Naive approach: measure distance to every single point. Correct, but slow.

KD-tree approach: use the tree structure to skip huge chunks of points.

Example: find the nearest point to target (10, 12).

### Step 1 — Walk down to a leaf, keeping track of the best point found so far.

At root (9,1), axis 0.
  10 > 9 → "near" side is RIGHT.
  Visit right side first.

At (13,15), axis 1.
  12 ≤ 15 → "near" side is LEFT.
  Visit left side first.

At (10,19), axis 0.
  This is a leaf. Current best: (10,19). Distance² = (10-10)²+(12-19)² = 49.

### Step 2 — On the way back up, check if we should look at the other side.

Back at (13,15). We visited left child (10,19). Best so far: 49.
Check distance from target to the splitting LINE at (13,15).
The split is on axis 1 (y). Target y = 12, pivot y = 15.
Distance to line = (12-15)² = 9.

9 < 49 → the other side of the line COULD have a closer point.
Visit right child of (13,15), which is (17,15).
Distance² to (17,15) = (10-17)²+(12-15)² = 49+9 = 58. Worse.

Best is still (10,19) with distance² 49.

Back at root (9,1). We visited right side. Best so far: 49.
Split is on axis 0 (x). Target x = 10, pivot x = 9.
Distance to line = (10-9)² = 1.

1 < 49 → the left side could have a closer point. Visit it.

At (2,7), axis 1.
  12 > 7 → near side is RIGHT. Visit right first.

At (6,12). Distance² = (10-6)²+(12-12)² = 16. Better! New best: (6,12).

Back at (2,7). Best now 16. Split on axis 1, distance to line = (12-7)² = 25.
25 > 16 → left side CANNOT have a closer point (the dividing line itself
is already farther than our best). PRUNE — skip left entirely.

Final answer: (6,12) with distance² 16.

### Why does pruning work?

The dividing line is the closest any point on the far side could
possibly be. If the line itself is already farther than our current
best, there's no point (pun intended) in looking there.

This is what makes KD-tree nearest neighbor fast: in practice, you
explore only a small fraction of the tree before finding the answer.

---

## RANGE SEARCH — Finding all points inside a box

Goal: return every point whose x is between [x_min, x_max] AND whose y
is between [y_min, y_max].

Example: find all points inside the box x∈[0,10], y∈[0,10].

At root (9,1), axis 0. Box x range is [0,10].
  - Is 0 ≤ 9? Yes → left subtree might have points inside box. Check left.
  - Is 10 ≥ 9? Yes → right subtree might have points inside box. Check right.
  - Is (9,1) inside [0,10]×[0,10]? 9 in [0,10] ✓, 1 in [0,10] ✓ → YES. Collect it.

Check left subtree (starting at (2,7)), axis 1. Box y range is [0,10].
  - Is 0 ≤ 7? Yes → check left.
  - Is 10 ≥ 7? Yes → check right.
  - Is (2,7) inside the box? 2 ✓, 7 ✓ → YES. Collect it.

  Left child of (2,7) is (3,6). Is (3,6) inside box? 3 ✓, 6 ✓ → YES. Collect.
  Right child of (2,7) is (6,12). Is (6,12) inside box? 6 ✓, 12 is NOT in [0,10] → NO.

Check right subtree (starting at (13,15)), axis 1. Box y range is [0,10].
  - Is 0 ≤ 15? Yes → would check left. But left is (10,19) — y=19 > 10, so no.
  - Is 10 ≥ 15? NO → RIGHT subtree has y values all ≥ 15. PRUNE right entirely.
  - Is (13,15) inside the box? x=13 is NOT in [0,10] → NO.

Result: (9,1), (2,7), (3,6).

The key efficiency idea: when the search box ends before the pivot on one
axis, you can skip that entire half of the tree. More pruning = faster.

---

## Summary — What each operation does in one sentence

| Operation       | What it does                                                   |
|-----------------|----------------------------------------------------------------|
| build()         | Organizes a pile of points into a balanced tree using medians. |
| insert()        | Walks down the tree and drops the new point at the right spot. |
| contains()      | Walks down the tree asking "left or right?" until found/gone.  |
| findMin()       | Finds the smallest value on one axis, pruning where possible.  |
| remove()        | Replaces the deleted node with the minimum from a subtree.     |
| nearestNeighbor()| Walks the tree and skips subtrees whose dividing line is far.  |
| rangeSearch()   | Collects all points inside a box, pruning out-of-range branches. |

---

## One last analogy — The entire thing as a filing cabinet

Imagine a filing cabinet with infinitely nested drawers.

- The top drawer is split by "last name A–M" (left) vs "N–Z" (right).
  (This is axis 0 — the first comparison.)

- Inside each drawer, folders are split by "first name A–M" vs "N–Z".
  (This is axis 1 — the second comparison.)

- Inside those folders, split by last name again.
  (Axis 0 again — it cycles.)

To find a person: you make one decision per level and open only the
matching drawer. You never open half the cabinet.

To add a person: walk down to the right drawer and drop the folder in.

To delete a person: pull the folder out, promote the next-most-similar
person to hold their spot so the cabinet's organization doesn't collapse.

That's a KD-tree.
