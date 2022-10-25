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
    const { min, max, _size } = this;
    if (x === min || x === max) { return false; }
    if (_size === 0) {
      this.min = x;
      this.max = x;
      this._size++;
      return true;
    }
    
    if (x < min) {
      this.min = x;
      x = min;
    } else if (x > max) {
      this.max = x;
      x = max;
    }

    if (_size === 1) {
      this._size++;
      return true;
    }

    const { clusters } = this;
    const i = x >>> this.shift;
    if (!clusters.hasOwnProperty(i)) {
      const cluster_size = 1 << this.shift;
      clusters[i] = new VEB(cluster_size);
      if (this.summary === null) {
        this.summary = new VEB(Math.ceil(this.bound / cluster_size));
      }
      this.summary.insert(i);
    }
    const is_new = clusters[i].insert(x & this.lo_mask);
    if (is_new) { this._size++; }
    return is_new;
  }

  public delete(x: number): boolean {
    let i: number;
    let j; Number;
    let cluster: VEB;
    const { min, max, _size } = this;
    if (x === min) {
      switch (_size) {
        // if there are no sub-clusters
        case 1:
          this.max = -1;
        case 2:
          this.min = this.max;
          this._size--;
          return true;
      }
      // otherwise, pull the min up from one level down
      i = this.summary!.min;
      cluster = this.clusters[i];
      j = cluster.min;
      this.min = (i << this.shift) | j;
    } else if (x === max) {
      switch (_size) {
        // if there are no sub-clusters
        case 1:
          this.min = -1;
        case 2:
          this.max = this.min;
          this._size--;
          return true;
      }
      // otherwise, pull the max up from one level down
      i = this.summary!.max;
      cluster = this.clusters[i];
      j = cluster.max;
      this.max = (i << this.shift) | j;
    } else {
      i = x >>> this.shift;
      j = x & this.lo_mask;
      cluster = this.clusters[i];
      if (!cluster) { return false; }
    }
    const had_x = cluster.delete(j);
    if (cluster._size === 0) {
      this.summary!.delete(i);
      if (this.summary!._size === 0) {
        this.summary = null;
      }
      delete this.clusters[i];
    }
    if (had_x) { this._size--; }
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