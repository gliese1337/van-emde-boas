# van-emde-boas
TypeScript implementation of [van Emde Boas trees](https://en.wikipedia.org/wiki/Van_Emde_Boas_tree).

A van Emde Boas tree efficiently stores integers in a predefined range from 0 to some upper bound `k`, and permits insert, delete, find, predecessor, and successor operations in `O(log log k)` time and `O(n)` space, where `n` is the number of stored elements. For a universe of 64-bit numbers, for example, `log log 2^64 = 6`, and a van Emde Boas tree thus becomes faster than, e.g., a binary search tree as soon as the number of stored values exceeds 64 (modulo differing constanty factors of the implementations). In general, van Emde Boas trees are worth considering in any situation where the range of values is constrained and the number of values to be stored is greater than the number of bits required to encode the largest number (again, modulo constant factors which may make simpler data structures faster in practice up to some multiple of that heuristic value), or whereever fast successor/predecessor queries are required. E.g., internet routers often use vEBs to store ranges of IP addresses.

This package exports a single class:

```ts
export declare class VEB {
    readonly bound: number;
    readonly size: number;
    constructor(bound: number);
    insert(x: number): boolean;
    delete(x: number): boolean;
    has(x: number): boolean;
    next(x: number): number;
    prev(x: number): number;
    keys(): Generator<number>;
    values(): Generator<number>;
    entries(): Generator<[number, number]>;
    [Symbol.iterator](): Generator<number>;
}
```

The `[Symbol.iterator]`, `keys`, and `values` methods each return a generator that iterates over the values stored in the tree, and `entries` duplicates those values to produce pairs, similar to the built-in `Set` object. The `size` property reports the number of elements currently stored in the tree. Other methods behave as follows:

* `insert(x)` returns true when `x` is successfully inserted, and false when `x` was already in the tree. Insertion does do bounds checking, and will throw an error for values that are not in the range `[0, bound)`.
* `delete(x)` returns true when `x` is successfully deleted, and false when `x` was not in the tree to begin with.
* `has(x)` returns true when `x` is in the tree (previously inserted and not deleted), and false otherwise.
* `next(x)` returns `x` if `x` is in the tree, `-1` if `x` is larger than any element in the tree, and otherwise returns the next value larger than `x` which is in the tree.
* `prev(x)` returns `x` if `x` is in the tree, `-1` if `x` is smaller than any element in the tree, and otherwise returns the next value smaller than `x` which is in the tree.

### Comparison to other Libraries

The only other NPM package currently implementing a van Emde Boas tree is [vebt](https://www.npmjs.com/package/vebt).
Compared to `vebt`, this implementation is consistently 2 to 3 times faster based on a combined benchmark of constructing a tree, inserting elements, querying successors of all elements, and deleting all elements. With delete operations removed from consideration, this package benchmarks as approximately 2.5 to 3.5 times faster than `vebt` for combined construction, insertion, and successor query operations. Insertion operations alone are of comparable speed for small (<= 8-bit) universes, but this library becomes 2 to 3 times faster than `vebt` for larger universe sizes. Additionally, `vebt` consistently throw's type errors when attempting to remove an element, and begins to throw errors on insertion in larger universes when `n` > 2^15.