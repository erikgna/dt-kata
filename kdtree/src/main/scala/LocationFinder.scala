import kdtree.{KDTree, Point}

case class POI(name: String, category: String, lat: Double, lng: Double) {
    def point: Point = Point(lat, lng)
}

class LocationFinder private (tree: KDTree, byPoint: Map[Point, POI]) {

    def size: Int = byPoint.size

    def register(poi: POI): LocationFinder = {
        new LocationFinder(KDTree.insert(tree, poi.point), byPoint.updated(poi.point, poi))
    }

    def unregister(poi: POI): LocationFinder = {
        new LocationFinder(KDTree.remove(tree, poi.point), byPoint - poi.point)
    }

    def nearest(lat: Double, lng: Double): Option[POI] = {
        KDTree.nearestNeighbor(tree, Point(lat, lng)).map(byPoint)
    }

    def within(lat: Double, lng: Double, radius: Double): List[POI] = {
        require(radius >= 0, "radius must be non-negative")
        val center = Point(lat, lng)
        val lower = Point(lat - radius, lng - radius)
        val upper = Point(lat + radius, lng + radius)
        val rSq = radius * radius

        KDTree
            .rangeSearch(tree, lower, upper)
            .filter(_.distanceSqTo(center) <= rSq)
            .map(byPoint)
    }

    def kNearest(lat: Double, lng: Double, k: Int): List[POI] = {
        require(k >= 0, "k must be non-negative")
        val target = Point(lat, lng)

        def loop(t: KDTree, remaining: Int, acc: List[POI]): List[POI] = {
            if (remaining == 0) {
                acc.reverse
            } else {
                KDTree.nearestNeighbor(t, target) match {
                    case None => acc.reverse
                    case Some(p) => loop(KDTree.remove(t, p), remaining - 1, byPoint(p) :: acc)
                }
            }
        }

        loop(tree, k, Nil)
    }

    def byCategory(category: String): List[POI] = {
        byPoint.values.filter(_.category == category).toList
    }
}

object LocationFinder {

    def empty: LocationFinder = new LocationFinder(KDTree.empty, Map.empty)

    def fromPOIs(pois: Seq[POI]): LocationFinder = {
        val tree = KDTree.build(pois.map(_.point))
        val byPoint = pois.map(p => p.point -> p).toMap
        new LocationFinder(tree, byPoint)
    }
}