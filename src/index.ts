export class VEB {
  private shift: number;
  private lo_mask: number;
  private cluster_size: number;
  private clusters: { [key: number]: VEB };
  private summary: VEB;
  private min = NaN;
  private max = NaN;
  
  constructor(public readonly bound: number) {
    const shift = Math.floor(Math.log2(bound)/2);
    this.shift = shift;
    
    const lo_mask = 0xffffffff >>> (32 - shift);
    this.lo_mask = lo_mask;

    const cluster_size = 1 << shift;
    this.cluster_size = cluster_size;
    this.clusters = {};

    const cluster_count = Math.ceil(bound / cluster_size);
    // can we add the summary structure lazily?
    this.summary = bound > 2 ? new VEB(cluster_count) : null as any;
    this.shift = shift;
  }

  public insert(x: number) {
    const { min, max } = this;
    if (isNaN(min)) {
      this.min = x;
      this.max = x;
    } else if (x < min) {
      this.min = x;
      this.insert(min);
    } else if (x > max) {
      this.max = x;
      this.insert(max);
    } else if (x !== min && x !== max) {
      const i = x >>> this.shift;
      if (!this.clusters.hasOwnProperty(i)) {
        this.clusters[i] = new VEB(this.cluster_size);
        this.summary.insert(i);
      }
      this.clusters[i].insert(x & this.lo_mask);
    }
  }

  public delete(x: number) {
    let i: number;
    let j; Number;
    let cluster: VEB;
    if (x === this.min) {
      i = this.summary ? this.summary.min : NaN;
      if (isNaN(i)) { // there are no sub-clusters
        if (this.max === this.min) {
          this.min = NaN;
          this.max = NaN;
        } else {
          this.min = this.max;
        }
        return;
      }
      // otherwise, pull the min up from one level down
      cluster = this.clusters[i];
      j = cluster.min;
      this.min = (i << this.shift) | j;
    } else if (x === this.max) {
      i = this.summary ? this.summary.max : NaN;
      if (isNaN(i)) { // there are no sub-subclusters
        if (this.max === this.min) {
          this.min = NaN;
          this.max = NaN;
        } else {
          this.max = this.min;
        }
        return;
      }
      // otherwise, pull the max up from one level down
      cluster = this.clusters[i];
      j = cluster.max;
      this.max = (i << this.shift) | j;
    } else {
      i = x >>> this.shift;
      j = x & this.lo_mask;
      cluster = this.clusters[i];
      if (!cluster) { return; }
    }
    cluster.delete(j);
    if (isNaN(cluster.min)) {
      this.summary.delete(i);
      delete this.clusters[i];
    }
  }

  public next(x: number): number {
    const { clusters, min, max, shift, summary } = this;
    if (x <= min) { return min; }
    let i = x >>> shift;
    const cluster = clusters[i];
    if (cluster) {
      const j = x & this.lo_mask;
      if (j <= cluster.max) { return (i << shift) | cluster.next(j); }
    }
    i = summary ? summary.next(i+1) : NaN;
    if (isNaN(i)) { return x <= max ? max : NaN; }
    return (i << shift) | clusters[i].min;
  }

  public has(x: number): boolean {
    if (x === this.min || x === this.max) { return true; }
    let i = x >>> this.shift;
    const { clusters } = this;
    if (!clusters.hasOwnProperty(i)) { return false; }
    const j = x & this.lo_mask;
    return clusters[i].has(j);
  }

  public prev(x: number): number {
    const { clusters, min, max, shift, summary } = this;
    if (x >= max) { return max; }
    let i = x >>> shift;
    const cluster = clusters[i];
    if (cluster) {
      const j = x & this.lo_mask;
      if (j >= cluster.min) { return (i << shift) | cluster.prev(j); }
    }
    i = summary && i > 0 ? summary.prev(i-1) : NaN;
    if (isNaN(i)) { return x >= min ? min : NaN; }
    return (i << shift) | clusters[i].max;
  }

  public *keys(): Generator<number> {
    const { min } = this;
    if (isNaN(min)) { return; }
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