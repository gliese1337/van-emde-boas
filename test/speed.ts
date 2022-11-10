import { VEB } from '../src';

function calcStats(xs: number[]) {
  xs.sort((a,b) => a-b);
  const sum = xs.reduce((a,b) => a+b);
  return {
    mean: (sum / xs.length)/1000,
    median: xs[xs.length>>1]/1000,
    p90: xs[(xs.length * 0.9)|0]/1000,
  };
}

function runTests(z: number, p: number) {

  console.log(`Tests for U = 2^${z}, P = 2^${p}:`);

  const vals: number[] = [];
  const istats: number[] = [];
  const nstats: number[] = [];
  const dstats: number[] = [];
  const l = 2**p;
  const y = 2**z;
  for (let i = 0; i < l; i++) {
    vals.push(Math.floor((Math.random() * y)));
  }

  for (let k = 0; k < 10; k++) {
    const u = new VEB(y);
    for (let i = 0; i < l; i+=8) {
      const n = vals[i];
      const s = process.hrtime.bigint();
      u.insert(n);
      istats.push(Number(process.hrtime.bigint() - s));
    }

    for (let i = 0; i < l; i++) {
      const n = vals[i];
      const s = process.hrtime.bigint();
      u.next(n+1);
      nstats.push(Number(process.hrtime.bigint() - s));
    }
    
    for (let i = 0; i < l; i++) {
      const n = vals[i];
      const s = process.hrtime.bigint();
      u.delete(n);
      dstats.push(Number(process.hrtime.bigint() - s));
    }
  }

  const isum = calcStats(istats);
  console.log(`  Insert: Mean(${isum.mean}us) Median(${isum.median}us) p90(${isum.p90}us)`);
  const nsum = calcStats(nstats);
  console.log(`  Next  : Mean(${nsum.mean}us) Median(${nsum.median}us) p90(${nsum.p90}us)`);
  const dsum = calcStats(dstats);
  console.log(`  Delete: Mean(${dsum.mean}us) Median(${dsum.median}us) p90(${dsum.p90}us)`);
}

runTests(8, 7);
runTests(16, 15);
runTests(32, 15);
runTests(32, 20);