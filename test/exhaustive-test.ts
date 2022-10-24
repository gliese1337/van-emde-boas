import 'mocha';
import { expect } from 'chai';
import { VEB } from '../src';

describe("Random Tests", () => {
  const entries: number[] = [];
  let x = 0;
  for (let i = 0; i < 16; i++) {
    x += 1 + Math.floor(4 * Math.random());
    entries.push(x);
  }

  const v = new VEB(64);

  it("should add all the numbers to the tree", () => {
    for (const x of entries) {
      v.insert(x);
      expect(v.has(x)).to.be.true;
    }
  });

  it("should have all the entries", () => {
    for (const x of entries) {
      expect(v.has(x)).to.be.true;
    }
  });
  
  it("should iterate over the entries", () => {
    expect([...v]).to.eql(entries);
  });
  
  it("should find all of the successors", () => {
    for (let i = 0; i < entries.length-1; i++) {
      expect(v.next(entries[i]+1)).to.eql(entries[i+1]);
    }
  });
  
  it("should find all of the predecessors", () => {
    for (let i = entries.length-1; i > 0; i--) {
      expect(v.prev(entries[i]-1)).to.eql(entries[i-1]);
    }
  });

  it("should delete all the entries", () => {
    for (const x of entries) {
      v.delete(x);
    }
    expect([...v]).to.eql([]);
  });

});