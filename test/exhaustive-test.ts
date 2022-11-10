import 'mocha';
import { expect } from 'chai';
import { VEB } from '../src';

for (let e = 3; e < 16; e++) {
  const bound = 2**e;
  describe(`Random Tests for u = ${bound}`, () => {

    it("should handle insertions with duplicates", () => {
      const v = new VEB(bound);
      const entries = new Set<number>();
      for (let i = 0; i < bound/2; i++) {
        const e = Math.floor((Math.random() * bound));
        v.insert(e);
        v.insert(e);
        entries.add(e);
      }
      expect(v.size).eqls(entries.size);
    });

    {
      const entries: number[] = [];
      const outries: number[] = [];
      {
        let x = 0;
        for (let i = 0; i < bound/4; i++) {
          x += 1 + Math.floor(2 * Math.random());
          entries.push(x);
          x += 1 + Math.floor(2 * Math.random());
          outries.push(x);
        }
      }

      const v = new VEB(bound);

      it("should add all the numbers to the tree", () => {
        for (const x of entries) {
          expect(v.insert(x)).to.be.true;
          expect(v.has(x)).to.be.true;
        }
      });

      it("should have all the entries", () => {
        for (const x of entries) {
          expect(v.has(x)).to.be.true;
        }
      });

      it("should not have elements that weren't added", () => {
        for (const x of outries) {
          expect(v.has(x)).to.be.false;
        }
      });

      it("should have the right size", () => {
        expect(v.size).to.eql(entries.length);
      });

      it("should be unchanged after inserting duplicates", () => {
        for (const x of entries) {
          expect(v.insert(x)).to.be.false;
        }
        expect(v.size).to.eql(entries.length);
      });

      it("should be unchanged after deleting missing items", () => {
        for (const x of outries) {
          expect(v.delete(x)).to.be.false;
        }
        for (const x of entries) {
          expect(v.has(x)).to.be.true;
        }
        expect(v.size).to.eql(entries.length);
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
          expect(v.delete(x)).to.be.true;
        }
        expect([...v]).to.eql([]);
        expect(v.size).to.eql(0);
      });
    }
  });
}