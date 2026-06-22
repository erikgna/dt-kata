package kdtree

// A point in k-dimensional space, backed by an immutable Vector of Doubles.
// Why Vector (not Array or List): it's immutable (safe to share freely, no defensive
// copies) and gives effectively constant-time indexed access, which we rely on in apply.
// A List would be O(n) to index; an Array would be mutable and break value equality.

// A case class is designed to hold immutable data. The compiler generates:
// 1. An apply factory in the companion, so we construct without "new".
// 2. The constructor params become public val fields (immutable getters).
// 3. Structural (value-based) equality + hashCode — two Points are equal if their
//    coords are equal. This is what makes ==, contains, and dedup work in the tree.
// 4. A copy method for making a modified clone (used everywhere for persistent updates).
// 5. A readable toString.
case class Point(coords: Vector[Double]):
  // Precondition checked at construction. Throws IllegalArgumentException if violated,
  // so an invalid Point can never exist — fail fast rather than later during a distance calc.
  require(coords.nonEmpty, "Point must have at least 1 dimension")

  // Number of dimensions — also called k. This is what makes the tree dimension-agnostic.
  def k: Int = coords.length

  // apply is special: p(i) is sugar the compiler rewrites to p.apply(i).
  // Lets us index a Point directly (p(i)) instead of reaching into p.coords(i).
  def apply(i: Int): Double = coords(i)

  // Squared Euclidean distance: sum of squared per-axis differences, WITHOUT the sqrt.
  // We only ever compare distances, and sqrt is monotonic, so the comparison result is
  // identical while we avoid a costly (and float-imprecise) sqrt on every node.
  def distanceSqTo(other: Point): Double =
    // zip pairs up coordinates by index; map squares each difference; sum totals them.
    // Note: zip truncates to the shorter vector, so mismatched dimensions won't throw here.
    coords.zip(other.coords).map((a, b) => (a - b) * (a - b)).sum
    // Point(0,0).distanceSqTo(Point(3,4)): zip → (0,3),(0,4); squares → 9,16; sum → 25.

// Companion object: shares the name Point. A type and an object can coexist by name.
object Point:
  // A second apply overload taking varargs (Double*), so callers write Point(1.0, 2.0)
  // instead of Point(Vector(1.0, 2.0)). xs arrives as a Seq; toVector converts it.
  // No clash with the case class's apply(Vector) — different parameter types resolve it.
  def apply(xs: Double*): Point = Point(xs.toVector)

// The tree is an algebraic data type (a "sum type"): one of exactly two shapes.
//   Empty — the base case / sentinel, means "no subtree here". We use this instead of
//           null so there's nothing to dereference unsafely, and instead of Option so the
//           recursion bottoms out naturally inside the same type.
//   Node  — recursive case: a point, the axis it splits on, and its left/right children.
// In Scala 3 an enum with parameterised cases is shorthand for a sealed trait + case
// classes. "sealed" is the key word: the compiler knows the FULL set of cases, so every
// pattern match below is checked for exhaustiveness — forget a case and it warns.
enum KDTree:
  case Empty
  case Node(point: Point, axis: Int, left: KDTree, right: KDTree)

// The enum holds only the data (the shape). This companion object holds the operations.
// This is the functional split: data is dumb and immutable, behaviour lives in functions
// that take a tree and return a NEW tree (KDTree.insert(tree, p)) rather than methods that
// mutate (tree.insert(p)). Every "modification" produces a new tree sharing untouched parts.
object KDTree:

  // Convenience accessor so callers don't have to reach for the Empty case directly.
  def empty: KDTree = KDTree.Empty

  /**
   * Build a balanced KD-tree from a collection of points.
   * Cost: O(n log² n). There are log n levels of recursion, and at each level we sort
   * the points (O(n log n) total work across that level). Picking the MEDIAN as the
   * pivot is what guarantees balance — each subtree gets half the points, so the tree
   * is O(log n) deep. (A faster build would use quickselect/nth_element to find the
   * median in O(n) instead of a full sort, bringing build down to O(n log n).)
   * depth has a default of 0 so external callers just write build(points); recursion
   * passes depth + 1 explicitly.
   */
  def build(points: Seq[Point], depth: Int = 0): KDTree =
    if points.isEmpty then KDTree.Empty
    else
      // Cycle axes by depth so each level splits on a different dimension, wrapping around.
      // points.head.k is the dimensionality (k); modulo turns depth into 0,1,..,k-1,0,1,...
      // Safe: we're in the else branch, so points is non-empty and head won't throw.
      val axis   = depth % points.head.k

      // Sort along the current axis so the median sits in the middle.
      // sortBy(_(axis)) is sortBy(p => p(axis)) — order by this axis's coordinate.
      val sorted = points.sortBy(_(axis))

      // Median index. This point becomes the pivot that splits the space in half on this axis.
      val mid    = sorted.length / 2

      KDTree.Node(
        point = sorted(mid),
        axis  = axis,
        // Left subtree gets everything before the median (indices 0..mid-1).
        // take(mid) returns those first mid elements.
        left  = build(sorted.take(mid), depth + 1),
        // Right subtree gets everything after the median (indices mid+1..end).
        // drop(mid + 1) skips the median itself so the pivot isn't duplicated.
        right = build(sorted.drop(mid + 1), depth + 1)
      )

  /**
   * Insert a point into an existing tree. O(log n) on a balanced tree.
   * Caveat a senior will probe: insert does NOT rebalance. A bad insertion order can
   * skew the tree toward O(n) depth over time — build is what gives balance. For a
   * long-lived tree you'd periodically rebuild, or use a self-balancing variant.
   */
  def insert(tree: KDTree, point: Point, depth: Int = 0): KDTree =
    tree match
      // Empty slot reached — this is where the point lands. Compute its split axis from
      // the depth we arrived at, so it follows the same axis-cycling rule as build.
      case KDTree.Empty =>
        KDTree.Node(point, depth % point.k, KDTree.Empty, KDTree.Empty)

      // "node @ Pattern" binds the whole matched Node to `node` AND destructures its
      // fields into p/axis/left/right. So we can return `node` unchanged, or rebuild it
      // with node.copy(...), without re-typing all the fields.
      case node @ KDTree.Node(p, axis, left, right) =>
        // Exact duplicate (value equality from the case class): return tree unchanged,
        // which means the same object — no allocation, the whole tree is shared.
        if p == point then node
        // Compare only on THIS node's split axis. <= sends equal-on-axis values left;
        // contains and remove use the identical rule, so all three stay consistent.
        // node.copy(left = ...) builds a new Node reusing p/axis/right, with only left
        // replaced — structural sharing: just the path to the insertion point is new.
        else if point(axis) <= p(axis) then node.copy(left = insert(left, point, depth + 1))
        // Strictly greater on this axis → right subtree.
        else node.copy(right = insert(right, point, depth + 1))

  /**
   * Exact membership test. O(log n) on a balanced tree.
   * loop is a nested helper that threads depth through the recursion. Note it's
   * tail-recursive (the recursive call is the last thing it does on each branch), so the
   * compiler turns it into a loop — no stack growth even on a deep tree.
   */
  def contains(tree: KDTree, point: Point): Boolean =
    def loop(node: KDTree, depth: Int): Boolean =
      node match
        // Hit an empty slot without matching — the point isn't in the tree.
        case KDTree.Empty => false
        case KDTree.Node(p, axis, left, right) =>
          // Value equality: exact coordinate match.
          if p == point then true
          // Otherwise follow the SAME branching rule insert used, so we walk to exactly
          // the slot where this point would have been placed. This is why exact lookup is
          // log n and not a full scan.
          else if point(axis) <= p(axis) then loop(left, depth + 1)
          else loop(right, depth + 1)
    loop(tree, 0)

  /**
   * Nearest-neighbour search. Returns None for an empty tree.
   * O(log n) average, but O(n) worst case (e.g. high dimensions or pathological layouts
   * where pruning rarely fires — the "curse of dimensionality").
   * The algorithm is depth-first with backtracking: descend to the leaf nearest the
   * target, then unwind, only re-descending into a sibling subtree when it could still
   * contain something closer. That conditional skip (the prune) is the whole point of the
   * structure — a brute-force scan would be O(n) every time.
   */
  def nearestNeighbor(tree: KDTree, target: Point): Option[Point] =
    // Tie-break with <= so equal distances keep `a` (the node already in hand); avoids
    // pointless churn. Uses squared distance, consistent with the rest of the file.
    def closer(a: Point, b: Point): Point =
      if a.distanceSqTo(target) <= b.distanceSqTo(target) then a else b

    // Nested recursive helper. `best` is the closest point found so far, carried down and
    // back up the recursion as an accumulator (this is what makes the backtracking work).
    def loop(node: KDTree, best: Option[Point]): Option[Point] =
      node match
        // Empty slot contributes nothing; hand the current best back up.
        case KDTree.Empty => best
        case KDTree.Node(p, axis, left, right) =>
          // Fold this node's point into the running best: if we already have one, keep the
          // closer of (p, best); if best is None (first node seen), seed it with p.
          // best.map(closer(p, _)) only runs when best is Some; .orElse covers the None case.
          val candidate = best.map(closer(p, _)).orElse(Some(p))

          // Visit the child on the SAME side as the target first. Going to the likely-closer
          // side first tightens `best` early, which makes the prune below more likely to fire.
          // val (near, far) = ... destructures the tuple into two vals in one statement.
          val (near, far) =
            if target(axis) <= p(axis) then (left, right) else (right, left)

          // Search the near side, threading the candidate best through.
          val afterNear   = loop(near, candidate)

          // Squared distance from the target to this node's splitting plane (just the gap
          // on this one axis). This is the minimum possible distance to ANYTHING on the far side.
          val axisDistSq  = math.pow(target(axis) - p(axis), 2)

          // Squared distance from target to the best we now hold. MaxValue if somehow none.
          val bestDistSq  = afterNear.map(_.distanceSqTo(target)).getOrElse(Double.MaxValue)

          // THE PRUNE: only cross to the far side if the splitting plane is closer than our
          // current best. If even the plane is farther than best, every point beyond it is
          // farther too, so the far subtree cannot improve the answer — skip it entirely.
          if axisDistSq <= bestDistSq then loop(far, afterNear) else afterNear

    // Kick off with no best yet.
    loop(tree, None)

  /**
   * Find the point with the smallest value on `searchAxis`. Returns None if empty.
   * This is a helper for remove (finding the replacement node), but is useful on its own.
   * Cost: O(n) worst case, not O(log n). Why: we can only prune when this node happens to
   * split on the SAME axis we're minimising. When it splits on a different axis, the
   * minimum could be in either child, so we must search both — and across the whole tree
   * that averages out to visiting ~O(√n)..O(n) nodes depending on shape.
   */
  def findMin(tree: KDTree, searchAxis: Int): Option[Point] =
    tree match
      case KDTree.Empty => None
      case KDTree.Node(p, splitAxis, left, right) =>
        if splitAxis == searchAxis then
          // This node splits on the axis we care about: by the tree invariant the right
          // subtree holds only values >= p on this axis, so the min can only be p or in the
          // left subtree. We skip the right subtree — the one place findMin gets to prune.
          val leftMin = findMin(left, searchAxis)
          // Seq(Some(p), leftMin) is a Seq[Option[Point]]; flatten drops any None and unwraps
          // the Somes into a plain Seq[Point]. minBy(_(searchAxis)) returns the point with the
          // smallest coordinate on this axis. (leftMin may be None; flatten just removes it.)
          Some(Seq(Some(p), leftMin).flatten.minBy(_(searchAxis)))
        else
          // Different split axis: no pruning possible, the minimum may live in either child,
          // so recurse into both and take the overall smallest among p, leftMin, rightMin.
          val leftMin  = findMin(left, searchAxis)
          val rightMin = findMin(right, searchAxis)
          Some(Seq(Some(p), leftMin, rightMin).flatten.minBy(_(searchAxis)))

  /**
   * Remove `point` from the tree. No-op if the point isn't present. O(log n) average
   * (but each step may call findMin, which is O(n) worst case — so worst case is higher).
   *
   * This is the classic KD-tree deletion (Bentley). A senior will ask: why always take the
   * MIN-on-this-axis from the RIGHT subtree, instead of the predecessor (max of left) like a
   * plain BST? Two reasons: (1) using max-of-left breaks down when several points share the
   * same coordinate on the split axis — min-of-right is always safe; (2) promoting the
   * right subtree's min keeps the invariant intact: the promoted value is <= everything
   * remaining on the right, and still >= everything on the left.
   *
   * Cases for the matched node:
   *   Has right subtree  → promote min-on-this-axis from the right, recursively delete it there.
   *   Right empty, left  → we can't take a min from the right (it's empty), so we take the
   *                        min from the LEFT and move the whole left subtree to the right
   *                        slot. This is the subtle bit: leaving it on the left could leave
   *                        duplicates-on-axis on the wrong side; moving it right restores
   *                        the invariant. (Left slot becomes Empty.)
   *   Leaf               → just drop it (replace with Empty).
   */
  def remove(tree: KDTree, point: Point, depth: Int = 0): KDTree =
    tree match
      case KDTree.Empty => KDTree.Empty  // Point not found along this path — no change.

      case node @ KDTree.Node(p, axis, left, right) =>
        if p == point then
          if right != KDTree.Empty then
            // Replacement = smallest point on THIS node's axis within the right subtree.
            // .get is safe: right is non-empty, so findMin returns Some.
            val successor = findMin(right, axis).get
            // New node carries the successor; the old left stays; the successor is then
            // removed from the right subtree so it doesn't appear twice.
            KDTree.Node(successor, axis, left, remove(right, successor, depth + 1))
          else if left != KDTree.Empty then
            // No right child: take the min from the left, and relocate the entire left
            // subtree into the RIGHT slot (left becomes Empty) to preserve the invariant.
            val successor = findMin(left, axis).get
            KDTree.Node(successor, axis, KDTree.Empty, remove(left, successor, depth + 1))
          else
            KDTree.Empty  // Leaf — nothing underneath, so the node just disappears.
        // Not this node: descend toward where the point must be, using insert's rule, and
        // copy the node with the rebuilt child (structural sharing on the untouched side).
        else if point(axis) <= p(axis) then
          node.copy(left  = remove(left,  point, depth + 1))
        else
          node.copy(right = remove(right, point, depth + 1))

  /**
   * Orthogonal range search: return every point inside the axis-aligned box [lower, upper]
   * (inclusive on every dimension). Cost: O(√n + m) for 2D (m = points reported), more
   * generally output-sensitive — we only descend into subtrees the box can actually reach.
   */
  def rangeSearch(tree: KDTree, lower: Point, upper: Point): List[Point] =
    // Precondition: the two corners must have the same dimensionality, else the per-axis
    // comparisons below are meaningless. require throws IllegalArgumentException if not.
    require(lower.k == upper.k, "lower and upper must have the same dimension")

    // True iff p is inside the box on EVERY axis.
    def inRange(p: Point): Boolean =
      // 0 until p.k is the half-open range 0..k-1 (the axis indices).
      // forall short-circuits: as soon as one axis fails the point is rejected.
      (0 until p.k).forall(i => p(i) >= lower(i) && p(i) <= upper(i))

    def loop(node: KDTree): List[Point] =
      node match
        case KDTree.Empty => Nil  // Nil = the empty List.
        case KDTree.Node(p, axis, left, right) =>
          // Include this node's point only if it's inside the box.
          val here        = if inRange(p) then List(p) else Nil

          // Prune by comparing the box against the splitting plane ON THIS AXIS only.
          // Left holds values <= p(axis). If the box's lower bound is already past p(axis),
          // the entire left subtree is left of the box → skip it.
          val searchLeft  = if lower(axis) <= p(axis) then loop(left) else Nil

          // Symmetric: if the box's upper bound is below p(axis), the whole right subtree
          // is right of the box → skip it. Otherwise the box straddles the plane; recurse.
          val searchRight = if upper(axis) >= p(axis) then loop(right) else Nil

          // ++ concatenates the lists. Order isn't meaningful for a set-style result.
          here ++ searchLeft ++ searchRight

    loop(tree)
