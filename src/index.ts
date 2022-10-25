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
    const { min, max, _size } = this;
    if (x === min || x === max) { return false; }
    let is_new = true;
    z: { 
      if (_size === 0) {
        this.min = x;
        this.max = x;
        break z;
      }
      
      if (x < min) {
        this.min = x;
        x = min;
      } else if (x > max) {
        this.max = x;
        x = max;
      }

      if (_size === 1) { break z; }

      const { clusters } = this;
      const i = x >>> this.shift;
      if (!clusters.hasOwnProperty(i)) {
        clusters[i] = new VEB(this.cluster_size);
        if (this.summary === stub) {
          this.summary = new VEB(this.cluster_count);
        }
        this.summary.insert(i);
      }
      is_new = clusters[i].insert(x & this.lo_mask);
    }
    if (is_new) { this._size++; }
    return is_new;
  }

  public delete(x: number): boolean {
    let i: number;
    let j; Number;
    const { min, max, _size } = this;
    let had_x = true;
    z: {
      let cluster: VEB;
      if (x === min) {
        switch (_size) {
          // if there are no sub-clusters
          case 1:
            this.max = NaN;
          case 2:
            this.min = this.max;
            break z;
        }
        // otherwise, pull the min up from one level down
        i = this.summary.min;
        cluster = this.clusters[i];
        j = cluster.min;
        this.min = (i << this.shift) | j;
      } else if (x === max) {
        switch (_size) {
          // if there are no sub-clusters
          case 1:
            this.min = NaN;
          case 2:
            this.max = this.min;
            break z;
        }
        // otherwise, pull the max up from one level down
        i = this.summary.max;
        cluster = this.clusters[i];
        j = cluster.max;
        this.max = (i << this.shift) | j;
      } else {
        i = x >>> this.shift;
        j = x & this.lo_mask;
        cluster = this.clusters[i];
        if (!cluster) { return false; }
      }
      had_x = cluster.delete(j);
      if (cluster._size === 0) {
        this.summary.delete(i);
        if (this.summary._size === 0) {
          this.summary = stub;
        }
        delete this.clusters[i];
      }
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