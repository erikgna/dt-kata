package kdtree

// ScalaTest is the testing library. We use two pieces of it:
//   AnyFlatSpec — lets us write tests as readable sentences: "X" should "do Y" in: ...
//   Matchers    — gives us words like shouldBe to check results.
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// "extends ... with ..." means this class gets the features of both.
class KDTreeSpec extends AnyFlatSpec with Matchers:

  // ── helpers ──────────────────────────────────────────────────────────────

  // Short helpers to build points: p2 for 2D, p3 for 3D. Saves typing Point(...) everywhere.
  def p2(x: Double, y: Double): Point = Point(x, y)
  def p3(x: Double, y: Double, z: Double): Point = Point(x, y, z)

  // A fixed set of 2D points reused across many tests.
  val pts2D: Seq[Point] = Seq(
    p2(3, 6), p2(17, 15), p2(13, 15), p2(6, 12),
    p2(9, 1), p2(2, 7), p2(10, 19)
  )

  // ── Point ─────────────────────────────────────────────────────────────────

  // Each test reads like a sentence. The code after "in:" runs; if a shouldBe
  // check fails, the test fails. "it" reuses the subject from the line above ("Point").
  "Point" should "report correct dimensionality" in:
    // shouldBe checks the left value equals the right one.
    p2(1, 2).k shouldBe 2
    p3(1, 2, 3).k shouldBe 3

  it should "compute squared distance correctly" in:
    p2(0, 0).distanceSqTo(p2(3, 4)) shouldBe 25.0
    p2(1, 1).distanceSqTo(p2(1, 1)) shouldBe 0.0

  it should "reject empty coordinate vectors" in:
    // Checks that running Point(Vector.empty) throws this error (the require in Point).
    an[IllegalArgumentException] should be thrownBy Point(Vector.empty)

  // ── KDTree.build ──────────────────────────────────────────────────────────

  "KDTree.build" should "produce Empty for an empty input" in:
    KDTree.build(Seq.empty) shouldBe KDTree.Empty

  it should "contain all inserted points after build" in:
    val tree = KDTree.build(pts2D)
    // foreach runs the check once per point: every point must be found in the tree.
    pts2D.foreach(pt => KDTree.contains(tree, pt) shouldBe true)

  it should "not report a point that was never inserted" in:
    val tree = KDTree.build(pts2D)
    KDTree.contains(tree, p2(0, 0)) shouldBe false

  // ── KDTree.insert ─────────────────────────────────────────────────────────

  "KDTree.insert" should "add a point to an empty tree" in:
    val tree = KDTree.insert(KDTree.empty, p2(1, 2))
    KDTree.contains(tree, p2(1, 2)) shouldBe true

  it should "handle inserting a duplicate without creating a second node" in:
    val t1 = KDTree.build(pts2D)
    val t2 = KDTree.insert(t1, pts2D.head)
    // Inserting a point that already exists changes nothing, so the trees are equal.
    t1 shouldBe t2

  it should "build incrementally and match contains results" in:
    // foldLeft starts with an empty tree and inserts each point one at a time,
    // feeding the growing tree into the next insert. The two _ are insert's
    // arguments: the tree so far and the next point.
    val tree = pts2D.foldLeft(KDTree.empty)(KDTree.insert(_, _))
    pts2D.foreach(pt => KDTree.contains(tree, pt) shouldBe true)

  // ── KDTree.nearestNeighbor ────────────────────────────────────────────────

  "KDTree.nearestNeighbor" should "return None on an empty tree" in:
    KDTree.nearestNeighbor(KDTree.empty, p2(1, 1)) shouldBe None

  it should "return the only point in a single-node tree" in:
    val tree = KDTree.build(Seq(p2(5, 5)))
    KDTree.nearestNeighbor(tree, p2(0, 0)) shouldBe Some(p2(5, 5))

  it should "find the exact point when it is in the tree" in:
    val tree = KDTree.build(pts2D)
    KDTree.nearestNeighbor(tree, p2(9, 1)) shouldBe Some(p2(9, 1))

  it should "find the closest point by Euclidean distance" in:
    val tree   = KDTree.build(pts2D)
    val target = p2(10, 12)
    // Work out the right answer the slow-but-obvious way: minBy scans every point
    // and keeps the one with the smallest distance. We then check the tree agrees.
    val expected = pts2D.minBy(_.distanceSqTo(target))
    KDTree.nearestNeighbor(tree, target) shouldBe Some(expected)

  it should "work correctly in 3D" in:
    val points = Seq(p3(1, 2, 3), p3(4, 5, 6), p3(7, 8, 9), p3(0, 0, 1))
    val tree   = KDTree.build(points)
    val target = p3(1, 1, 1)
    val expected = points.minBy(_.distanceSqTo(target))
    KDTree.nearestNeighbor(tree, target) shouldBe Some(expected)

  // ── KDTree.rangeSearch ────────────────────────────────────────────────────

  "KDTree.rangeSearch" should "return empty for an empty tree" in:
    KDTree.rangeSearch(KDTree.empty, p2(0, 0), p2(10, 10)) shouldBe Nil

  it should "return all points when the range covers the whole space" in:
    val tree   = KDTree.build(pts2D)
    val result = KDTree.rangeSearch(tree, p2(-1000, -1000), p2(1000, 1000))
    // toSet ignores order and duplicates, so we compare contents not arrangement.
    result.toSet shouldBe pts2D.toSet

  it should "return no points when the range is empty" in:
    val tree   = KDTree.build(pts2D)
    val result = KDTree.rangeSearch(tree, p2(100, 100), p2(200, 200))
    result shouldBe Nil

  it should "return only points strictly inside the given range" in:
    val tree   = KDTree.build(pts2D)
    val result = KDTree.rangeSearch(tree, p2(0, 0), p2(10, 10))
    // The slow reference answer: filter keeps only the points inside the box by hand.
    val expected = pts2D.filter(p => p(0) >= 0 && p(0) <= 10 && p(1) >= 0 && p(1) <= 10)
    result.toSet shouldBe expected.toSet

  it should "include boundary points (inclusive range)" in:
    val tree   = KDTree.build(pts2D)
    // p2(9,1) sits exactly on the boundary
    // should contain checks the result list includes this point.
    val result = KDTree.rangeSearch(tree, p2(9, 1), p2(17, 15))
    result should contain(p2(9, 1))

  // ── KDTree.findMin ────────────────────────────────────────────────────────

  "KDTree.findMin" should "return None on an empty tree" in:
    KDTree.findMin(KDTree.empty, 0) shouldBe None

  it should "return the only point for a single-node tree" in:
    val tree = KDTree.build(Seq(p2(5, 3)))
    KDTree.findMin(tree, 0) shouldBe Some(p2(5, 3))
    KDTree.findMin(tree, 1) shouldBe Some(p2(5, 3))

  it should "find the minimum along axis 0 (x)" in:
    val tree = KDTree.build(pts2D)
    // brute-force reference
    val expected = pts2D.minBy(_(0))
    KDTree.findMin(tree, 0) shouldBe Some(expected)

  it should "find the minimum along axis 1 (y)" in:
    val tree     = KDTree.build(pts2D)
    val expected = pts2D.minBy(_(1))
    KDTree.findMin(tree, 1) shouldBe Some(expected)

  it should "work on a 3-D tree for every axis" in:
    val points = Seq(p3(3, 1, 4), p3(1, 5, 9), p3(2, 6, 5), p3(8, 9, 7))
    val tree   = KDTree.build(points)
    // Loop over axes 0, 1, 2 and check findMin against the slow minBy answer each time.
    for axis <- 0 until 3 do
      KDTree.findMin(tree, axis) shouldBe Some(points.minBy(_(axis)))

  // ── KDTree.remove ─────────────────────────────────────────────────────────

  "KDTree.remove" should "return Empty when removing from an empty tree" in:
    KDTree.remove(KDTree.empty, p2(1, 2)) shouldBe KDTree.Empty

  it should "be a no-op when the point is not in the tree" in:
    val tree    = KDTree.build(pts2D)
    val removed = KDTree.remove(tree, p2(0, 0))
    pts2D.foreach(pt => KDTree.contains(removed, pt) shouldBe true)

  it should "remove a leaf node correctly" in:
    // Insert a single point then remove it — tree must become Empty.
    val tree    = KDTree.insert(KDTree.empty, p2(1, 2))
    val removed = KDTree.remove(tree, p2(1, 2))
    removed shouldBe KDTree.Empty

  it should "remove each point without affecting the others" in:
    val tree = KDTree.build(pts2D)
    // For each point: remove it, confirm it's gone, and confirm every OTHER point stays.
    for target <- pts2D do
      val removed = KDTree.remove(tree, target)
      KDTree.contains(removed, target) shouldBe false
      // filterNot keeps every point except the one we removed.
      pts2D.filterNot(_ == target).foreach { pt =>
        KDTree.contains(removed, pt) shouldBe true
      }

  it should "allow re-insertion after removal" in:
    val tree    = KDTree.build(pts2D)
    val target  = pts2D.head
    val removed = KDTree.remove(tree, target)
    val readded = KDTree.insert(removed, target)
    KDTree.contains(readded, target) shouldBe true

  it should "handle removing all points one by one" in:
    val tree = KDTree.build(pts2D)
    // foldLeft removes each point in turn, passing the shrinking tree forward.
    val empty = pts2D.foldLeft(tree)(KDTree.remove(_, _))
    pts2D.foreach(pt => KDTree.contains(empty, pt) shouldBe false)
