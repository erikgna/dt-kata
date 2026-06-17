import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class LocationFinderSpec extends AnyFlatSpec with Matchers {

    val pizza = POI("Pizza Nice", "restaurant", 0.0, 0.0)
    val sushi = POI("Sushi Bar", "restaurant", 1.0, 1.0)
    val burger = POI("Burger Big", "restaurant", 5.0, 5.0)
    val park = POI("Central Park", "parl", 2.0, 2.0)
    val museum = POI("Art Museum", "museum", 10.0, 10.0)

    val all: Seq[POI] = Seq(pizza, sushi, burger, park, museum)


    "LocationFinder.empty" should "have size 0" in {
        LocationFinder.empty.size shouldBe 0
    }

    it should "return None for nearest on an empty index" in {
        LocationFinder.empty.nearest(0, 0) shouldBe None
    }

    "fromPOIs" should "index every POI" in {
        val finder = LocationFinder.fromPOIs(all)
        finder.size shouldBe all.size
    }
}
