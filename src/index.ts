export class VEB {
  private shift: number;
  private lo_mask: number;
  private clusters: Record<number, VEB>;
  private summary: VEB | null = null;
  private min = -1;
  private max = -1;
  private _size = 0;
  
  constructor(public readonly bound: number) {
    const shift = Math.floor(Math.log2(bound)/2);
    this.shift = shift;
    
    const lo_mask = 0xffffffff >>> (32 - shift);
    this.lo_mask = lo_mask;

    this.clusters = {};
  }

  get size() { return this._size; }

  public insert(x: number): boolean {
    let t: VEB = this;
    let top = 0;
    const path: VEB[] = [];
    for (;;) {
      const { min, max, _size } = t;
      if (x === min || x === max) { return false; }
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

      if (_size === 1) break;
      
      const { clusters } = t;
      const i = x >>> t.shift;
      let cluster = clusters[i];
      if (!cluster) {
        const cluster_size = 1 << t.shift;
        cluster = new VEB(cluster_size);
        clusters[i] = cluster;
        if (t.summary === null) {
          t.summary = new VEB(Math.ceil(t.bound / cluster_size));
        }
        t.summary.insert(i);
      }
      // this is equivalent to a recursive call
      path[top++] = t;
      x = x & t.lo_mask;
      t = cluster;
    }
    while (top > 0) { path[--top]._size++ }
    t._size++;
    return true;
  }

  public delete(x: number): boolean {
    z: {
      let i: number;
      let j; Number;
      let cluster: VEB;
      const { min, max, _size } = this;
      if (x === min) {
        switch (_size) {
          // if there are no sub-clusters
          case 1: this.max = -1;
          case 2: this.min = this.max;
          break z;
        }
        // otherwise, pull the min up from one level down
        i = this.summary!.min;
        cluster = this.clusters[i];
        j = cluster.min;
        this.min = (i << this.shift) | j;
      } else if (x === max) {
        switch (_size) {
          // if there are no sub-clusters
          case 1: this.min = -1;
          case 2: this.max = this.min;
          break z;
        }
        // otherwise, pull the max up from one level down
        i = this.summary!.max;
        cluster = this.clusters[i];
        j = cluster.max;
        this.max = (i << this.shift) | j;
      } else {
        i = x >>> this.shift;
        cluster = this.clusters[i];
        if (!cluster) { return false; }
        j = x & this.lo_mask;
      }
      if (!cluster.delete(j)) { return false; }
      if (cluster._size === 0) {
        this.summary!.delete(i);
        if (this.summary!._size === 0) {
          this.summary = null;
        }
        delete this.clusters[i];
      }
    }
    this._size--;
    return true;
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
      i = summary !== null ? summary.next(i+1) : -1;
      if (i === -1) { return x <= max ? hi | max : -1; }
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
      i = i > 0 && summary !== null ? summary.prev(i-1) : -1;
      if (i === -1) { return x >= min ? hi | min : -1; }
      return hi | (i << shift) | clusters[i].max;
    }
  }

  public *keys(): Generator<number> {
    const { min, _size } = this;
    if (_size === 0) { return; }
    yield min;
    const { max, clusters } = this;
    if (max > min) {
      if (this.summary) {
        const { shift } = this;
        for (const i of this.summary) {
          for (const j of clusters[i]) {
            yield (i << shift) | j;
          }
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