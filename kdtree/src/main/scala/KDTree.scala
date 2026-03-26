package kdtree

// A point in k-dimensional space, backed by an immutable Vector of Doubles.
case class Point(coords: Vector[Double]):
  require(coords.nonEmpty, "Point must have at least 1 dimension")

  // Number of dimensions — also called k.
  def k: Int = coords.length

  // Syntactic sugar: point(i) instead of point.coords(i).
  def apply(i: Int): Double = coords(i)

  // Squared Euclidean distance. Avoids a sqrt, which is sufficient for comparisons.
  def distanceSqTo(other: Point): Double =
    coords.zip(other.coords).map((a, b) => (a - b) * (a - b)).sum

object Point:
  // Vararg constructor so callers can write Point(1.0, 2.0) instead of Point(Vector(1.0, 2.0)).
  def apply(xs: Double*): Point = Point(xs.toVector)

// The tree itself is an algebraic data type with two cases:
//   Empty — a null leaf, signals the absence of a subtree.
//   Node  — holds a point, the axis it was split on, and two child subtrees.
enum KDTree:
  case Empty
  case Node(point: Point, axis: Int, left: KDTree, right: KDTree)

object KDTree:

  def empty: KDTree = KDTree.Empty

  /** Build a balanced KD-tree from a collection of points. O(n log² n). */
  def build(points: Seq[Point], depth: Int = 0): KDTree =
    if points.isEmpty then KDTree.Empty
    else
      // Cycle through axes by depth so each level splits on a different dimension.
      val axis   = depth % points.head.k

      // Sort along the current axis to find the median.
      val sorted = points.sortBy(_(axis))

      // The median point becomes this node's pivot — it splits the space in half.
      val mid    = sorted.length / 2

      KDTree.Node(
        point = sorted(mid),
        axis  = axis,
        // Points to the left of the median go into the left subtree.
        left  = build(sorted.take(mid), depth + 1),
        // Points to the right of the median go into the right subtree.
        right = build(sorted.drop(mid + 1), depth + 1)
      )

  /** Insert a point into an existing tree. O(log n) on balanced trees. */
  def insert(tree: KDTree, point: Point, depth: Int = 0): KDTree =
    tree match
      // Reached a null leaf — place the new node here with the correct split axis.
      case KDTree.Empty =>
        KDTree.Node(point, depth % point.k, KDTree.Empty, KDTree.Empty)

      case node @ KDTree.Node(p, axis, left, right) =>
        // Duplicate: the point already exists, return the tree unchanged.
        if p == point then node
        // New point belongs in the left subtree (coord <= pivot on this axis).
        else if point(axis) <= p(axis) then node.copy(left = insert(left, point, depth + 1))
        // New point belongs in the right subtree (coord > pivot on this axis).
        else node.copy(right = insert(right, point, depth + 1))

  /** Exact membership test. O(log n) on balanced trees. */
  def contains(tree: KDTree, point: Point): Boolean =
    def loop(node: KDTree, depth: Int): Boolean =
      node match
        // Fell off the tree without finding the point.
        case KDTree.Empty => false
        case KDTree.Node(p, axis, left, right) =>
          // Found an exact match.
          if p == point then true
          // Descend left or right using the same axis logic as insert.
          else if point(axis) <= p(axis) then loop(left, depth + 1)
          else loop(right, depth + 1)
    loop(tree, 0)

  /** Nearest-neighbour search. Returns None for an empty tree. O(log n) average. */
  def nearestNeighbor(tree: KDTree, target: Point): Option[Point] =
    // Returns whichever of a or b is closer to target (using squared distance).
    def closer(a: Point, b: Point): Point =
      if a.distanceSqTo(target) <= b.distanceSqTo(target) then a else b

    def loop(node: KDTree, best: Option[Point]): Option[Point] =
      node match
        case KDTree.Empty => best
        case KDTree.Node(p, axis, left, right) =>
          // Update the running best with the current node's point.
          val candidate = best.map(closer(p, _)).orElse(Some(p))

          // Choose which child to visit first: the one on the same side as target.
          // Searching the "near" side first maximises early pruning.
          val (near, far) =
            if target(axis) <= p(axis) then (left, right) else (right, left)

          // Recurse into the near side, carrying the updated best.
          val afterNear   = loop(near, candidate)

          // Squared distance from target to the splitting hyperplane at this node.
          val axisDistSq  = math.pow(target(axis) - p(axis), 2)

          // Squared distance to the best point found so far.
          val bestDistSq  = afterNear.map(_.distanceSqTo(target)).getOrElse(Double.MaxValue)

          // Only visit the far side if the splitting hyperplane is closer than
          // the current best — otherwise a closer point cannot exist there.
          if axisDistSq <= bestDistSq then loop(far, afterNear) else afterNear

    loop(tree, None)

  /** Orthogonal range search: all points with coords in [lower, upper] per dimension. */
  def rangeSearch(tree: KDTree, lower: Point, upper: Point): List[Point] =
    require(lower.k == upper.k, "lower and upper must have the same dimension")

    // Check whether every coordinate of p falls within the query box.
    def inRange(p: Point): Boolean =
      (0 until p.k).forall(i => p(i) >= lower(i) && p(i) <= upper(i))

    def loop(node: KDTree): List[Point] =
      node match
        case KDTree.Empty => Nil
        case KDTree.Node(p, axis, left, right) =>
          // Collect this node if it lies inside the box.
          val here        = if inRange(p) then List(p) else Nil

          // Prune left subtree: if the query box's lower bound on this axis
          // is already greater than the pivot, nothing in the left subtree qualifies.
          val searchLeft  = if lower(axis) <= p(axis) then loop(left) else Nil

          // Prune right subtree: if the query box's upper bound on this axis
          // is less than the pivot, nothing in the right subtree qualifies.
          val searchRight = if upper(axis) >= p(axis) then loop(right) else Nil

          here ++ searchLeft ++ searchRight

    loop(tree)
