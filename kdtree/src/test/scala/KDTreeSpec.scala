package kdtree

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class KDTreeSpec extends AnyFlatSpec with Matchers:

  // ── helpers ──────────────────────────────────────────────────────────────

  def p2(x: Double, y: Double): Point = Point(x, y)
  def p3(x: Double, y: Double, z: Double): Point = Point(x, y, z)

  val pts2D: Seq[Point] = Seq(
    p2(3, 6), p2(17, 15), p2(13, 15), p2(6, 12),
    p2(9, 1), p2(2, 7), p2(10, 19)
  )

  // ── Point ─────────────────────────────────────────────────────────────────

  "Point" should "report correct dimensionality" in:
    p2(1, 2).k shouldBe 2
    p3(1, 2, 3).k shouldBe 3

  it should "compute squared distance correctly" in:
    p2(0, 0).distanceSqTo(p2(3, 4)) shouldBe 25.0
    p2(1, 1).distanceSqTo(p2(1, 1)) shouldBe 0.0

  it should "reject empty coordinate vectors" in:
    an[IllegalArgumentException] should be thrownBy Point(Vector.empty)

  // ── KDTree.build ──────────────────────────────────────────────────────────

  "KDTree.build" should "produce Empty for an empty input" in:
    KDTree.build(Seq.empty) shouldBe KDTree.Empty

  it should "contain all inserted points after build" in:
    val tree = KDTree.build(pts2D)
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
    // the tree structure should be identical (same root node reference)
    t1 shouldBe t2

  it should "build incrementally and match contains results" in:
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
    // brute-force reference
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
    result.toSet shouldBe pts2D.toSet

  it should "return no points when the range is empty" in:
    val tree   = KDTree.build(pts2D)
    val result = KDTree.rangeSearch(tree, p2(100, 100), p2(200, 200))
    result shouldBe Nil

  it should "return only points strictly inside the given range" in:
    val tree   = KDTree.build(pts2D)
    val result = KDTree.rangeSearch(tree, p2(0, 0), p2(10, 10))
    // brute-force reference
    val expected = pts2D.filter(p => p(0) >= 0 && p(0) <= 10 && p(1) >= 0 && p(1) <= 10)
    result.toSet shouldBe expected.toSet

  it should "include boundary points (inclusive range)" in:
    val tree   = KDTree.build(pts2D)
    // p2(9,1) sits exactly on the boundary
    val result = KDTree.rangeSearch(tree, p2(9, 1), p2(17, 15))
    result should contain(p2(9, 1))
