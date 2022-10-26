const stub = {
  next(_: number) { return NaN; },
  prev(_: number) { return NaN; },
  *[Symbol.iterator]() {},
} as unknown as VEB;

export class VEB {
  private shift: number;
  private lo_mask: number;
  private cluster_size: number;
  private cluster_count: number;
  private clusters: { [key: number]: VEB };
  private summary: VEB = stub;
  private min = NaN;
  private max = NaN;
  private _size = 0;
  
  constructor(public readonly bound: number) {
    const shift = Math.floor(Math.log2(bound)/2);
    this.shift = shift;
    
    const lo_mask = 0xffffffff >>> (32 - shift);
    this.lo_mask = lo_mask;

    const cluster_size = 1 << shift;
    this.cluster_size = cluster_size;
    this.clusters = {};

    this.cluster_count = Math.ceil(bound / cluster_size);
    this.shift = shift;
  }

  get size() { return this._size; }

  public insert(x: number): boolean {
    let is_new = true;
    let t: VEB = this;
    const path: VEB[] = [];
    for (;;) {
      const { min, max, _size } = t;
      if (x === min || x === max) {
        is_new = false;
        break;
      }

      if (_size === 0) {
        t.min = x;
        t.max = x;
        break;
      }
      
      if (x < min) {
        t.min = x;
        x = min;
      } else if (x > max) {
        t.max = x;
        x = max;
      }

      if (_size === 1) { break; }

      const { clusters } = t;
      const i = x >>> t.shift;
      if (!clusters.hasOwnProperty(i)) {
        clusters[i] = new VEB(t.cluster_size);
        if (t.summary === stub) {
          t.summary = new VEB(t.cluster_count);
        }
        t.summary.insert(i);
      }
      // this is equivalent to a recursive call
      path.push(t);
      x = x & t.lo_mask;
      t = clusters[i];
    }
    
    if (is_new) {
      for (const t of path) { t._size++ }
      t._size++;
    }
    return is_new;
  }

  public delete(x: number): boolean {
    let i: number;
    let j; Number;
    let had_x = true;
    let t: VEB = this;
    const path: [VEB, number][] = [];
    z: for (;;) {
      const { min, max, _size } = t;
      let cluster: VEB;
      if (x === min) {
        switch (_size) {
          // if there are no sub-clusters
          case 1:
            t.max = NaN;
          case 2:
            t.min = t.max;
            break z;
        }
        // otherwise, pull the min up from one level down
        i = t.summary.min;
        cluster = t.clusters[i];
        j = cluster.min;
        t.min = (i << t.shift) | j;
      } else if (x === max) {
        switch (_size) {
          // if there are no sub-clusters
          case 1:
            t.min = NaN;
          case 2:
            t.max = t.min;
            break z;
        }
        // otherwise, pull the max up from one level down
        i = t.summary.max;
        cluster = t.clusters[i];
        j = cluster.max;
        t.max = (i << t.shift) | j;
      } else {
        i = x >>> t.shift;
        j = x & t.lo_mask;
        cluster = t.clusters[i];
        if (!cluster) { 
          had_x = false;
          break;
        }
      }
      // this is equivalent to a recursive call
      path.push([t, i]);
      t = cluster;
      x = j;
    }
    if (had_x) {
      for (const [t, i] of path) {
        t._size--;
        // We're moving forward, so the sub-cluster
        // size will not have been updated yet. Thus,
        // we check for 1, which would become 0,
        // rather than checking for zero directly.
        if (t.clusters[i]._size === 1) {
          if (t.summary._size === 1) {
            t.summary = stub;
          } else {
            t.summary.delete(i);
          }
          delete t.clusters[i];
          // if we delete a cluster, all of its
          // children will be unreferenced, so
          // there's no need to keep the rest
          // of them up-to-date.
          return true;
        }
      }
      t._size--;
    }
    return had_x;
  }

  public next(x: number): number {
    let t: VEB = this;
    let hi = 0;
    for (;;) {
      const { clusters, min, max, shift, summary } = t;
      if (x <= min) { return hi | min; }
      let i = x >>> shift;
      const cluster = clusters[i];
      if (cluster) {
        const j = x & t.lo_mask;
        if (j <= cluster.max) {
          // this is equivalent to a recursive call
          hi = hi | (i << shift);
          t = cluster;
          x = j;
          continue;
        }
      }
      i = summary.next(i+1);
      if (isNaN(i)) { return x <= max ? hi | max : NaN; }
      return hi | (i << shift) | clusters[i].min;
    }
  }

  public has(x: number): boolean {
    let t: VEB = this;
    for (;;) {
      if (x === t.min || x === t.max) { return true; }
      const cluster = t.clusters[x >>> t.shift];
      if (!cluster) { return false; }
      x = x & t.lo_mask;
      t = cluster;
    }
  }

  public prev(x: number): number {
    let t: VEB = this;
    let hi = 0;
    for (;;) {
      const { clusters, min, max, shift, summary } = t;
      if (x >= max) { return hi | max; }
      let i = x >>> shift;
      const cluster = clusters[i];
      if (cluster) {
        const j = x & t.lo_mask;
        if (j >= cluster.min) {
          // this is equivalent to a recursive call
          hi = hi | (i << shift);
          t = cluster;
          x = j;
          continue;
        }
      }
      i = i > 0 ? summary.prev(i-1) : NaN;
      if (isNaN(i)) { return x >= min ? hi | min : NaN; }
      return hi | (i << shift) | clusters[i].max;
    }
  }

  public *keys(): Generator<number> {
    const { min, _size } = this;
    if (_size === 0) { return; }
    yield min;
    const { max, clusters } = this;
    if (max > min) {
      const { shift } = this;
      for (const i of this.summary) {
        for (const j of clusters[i]) {
          yield (i << shift) | j;
        }
      }
      yield max;
    }
  }

  public values() {
    return this.keys();
  }
 
  public *entries(): Generator<[number, number]> {
    for (const i of this.keys()) {
      yield [i, i];
    }
  }

  public [Symbol.iterator]() {
    return this.keys();
  }
}