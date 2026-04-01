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
