node_modules/.bin/vitest run --reporter=verbose --test-name-pattern="ignores duplicates — tree structure unchanged"

## Tree Data Structures Kata

        1. What is the use case for you DS?
        2. What are the pros and cons?
        3. Show the Code
        4. Show the Tests

Team Yellow: K-Dimensional Tree in Scala 3 + Tests.

## Question 1

**Find the closest point(s) to a given query point.**

- Recommendation systems
- Image similarity search
- Game AI (finding nearest objects)

**Find all points within a region**

- GIS / maps
- Collision detection
- Spatial filtering

**Machine Learning (KNN)**

- Instead of scanning all points → reduces search space
- Works well for low-dimensional data

**Computer Graphics**

- Ray tracing
- Object clustering

## Pros and Cons

**Pros**

- Fast average queries
- Average O(log n) for nearest neighbor
- Much faster than brute force (O(n))
- Easy to understand: recursive binary tree
- Splits space using axis-aligned planes
- No heavy overhead compared to some spatial indexes
- If your dataset doesn’t change much → very efficient

**Cons**

- Performance Degrades in High Dimensions
- After ~10–20 dimensions, performance approaches brute force
- Insertions/deletions are costly
- Tree can become unbalanced
- Often requires rebuilding
- Not Always Balanced depends on how data is inserted
- Poor balance → slower queries
- Doesn’t adapt to arbitrary data distributions
- Can be inefficient for clustered or skewed data

## When to Use vs Avoid

**Use KD-Tree when:**

- Dimensions are low (≤10 ideally)
- Data is mostly static
- You need fast nearest neighbor or range queries

**Avoid when:**

- High-dimensional data (e.g., embeddings, NLP vectors)
- Data changes frequently
- You need approximate but faster methods










[insert] Hit empty slot → place (3, 6) here (axis=0/X)
[insert] At node (3, 6) | axis=0(X): new[X]=17 > pivot[X]=3 → go RIGHT
  [insert] Hit empty slot → place (17, 15) here (axis=1/Y)
[insert] At node (3, 6) | axis=0(X): new[X]=13 > pivot[X]=3 → go RIGHT
  [insert] At node (17, 15) | axis=1(Y): new[Y]=15 <= pivot[Y]=15 → go LEFT
    [insert] Hit empty slot → place (13, 15) here (axis=0/X)
[insert] At node (3, 6) | axis=0(X): new[X]=6 > pivot[X]=3 → go RIGHT
  [insert] At node (17, 15) | axis=1(Y): new[Y]=12 <= pivot[Y]=15 → go LEFT
    [insert] At node (13, 15) | axis=0(X): new[X]=6 <= pivot[X]=13 → go LEFT
      [insert] Hit empty slot → place (6, 12) here (axis=1/Y)
(9, 1)
[insert] At node (3, 6) | axis=0(X): new[X]=9 > pivot[X]=3 → go RIGHT
  [insert] At node (17, 15) | axis=1(Y): new[Y]=1 <= pivot[Y]=15 → go LEFT
    [insert] At node (13, 15) | axis=0(X): new[X]=9 <= pivot[X]=13 → go LEFT
      [insert] At node (6, 12) | axis=1(Y): new[Y]=1 <= pivot[Y]=12 → go LEFT
        [insert] Hit empty slot → place (9, 1) here (axis=0/X)
[insert] At node (3, 6) | axis=0(X): new[X]=2 <= pivot[X]=3 → go LEFT
  [insert] Hit empty slot → place (2, 7) here (axis=1/Y)
[insert] At node (3, 6) | axis=0(X): new[X]=10 > pivot[X]=3 → go RIGHT
  [insert] At node (17, 15) | axis=1(Y): new[Y]=19 > pivot[Y]=15 → go RIGHT
    [insert] Hit empty slot → place (10, 19) here (axis=0/X)
[contains] FOUND (3, 6)!
[contains] At node (3, 6) | axis=0(X): target[X]=17 > pivot=3 → search RIGHT
  [contains] FOUND (17, 15)!
[contains] At node (3, 6) | axis=0(X): target[X]=13 > pivot=3 → search RIGHT
  [contains] At node (17, 15) | axis=1(Y): target[Y]=15 <= pivot=15 → search LEFT
    [contains] FOUND (13, 15)!
[contains] At node (3, 6) | axis=0(X): target[X]=6 > pivot=3 → search RIGHT
  [contains] At node (17, 15) | axis=1(Y): target[Y]=12 <= pivot=15 → search LEFT
    [contains] At node (13, 15) | axis=0(X): target[X]=6 <= pivot=13 → search LEFT
      [contains] FOUND (6, 12)!
[contains] At node (3, 6) | axis=0(X): target[X]=9 > pivot=3 → search RIGHT
  [contains] At node (17, 15) | axis=1(Y): target[Y]=1 <= pivot=15 → search LEFT
    [contains] At node (13, 15) | axis=0(X): target[X]=9 <= pivot=13 → search LEFT
      [contains] At node (6, 12) | axis=1(Y): target[Y]=1 <= pivot=12 → search LEFT
        [contains] FOUND (9, 1)!
[contains] At node (3, 6) | axis=0(X): target[X]=2 <= pivot=3 → search LEFT
  [contains] FOUND (2, 7)!
[contains] At node (3, 6) | axis=0(X): target[X]=10 > pivot=3 → search RIGHT
  [contains] At node (17, 15) | axis=1(Y): target[Y]=19 > pivot=15 → search RIGHT
    [contains] FOUND (10, 19)!