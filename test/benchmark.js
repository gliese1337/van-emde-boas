const Benchtable = require('benchtable');
const { VEBX } = require('vebt');
const { VEB } = require('../bin');

const suite = new Benchtable('VEB', { isTransposed : true });

suite.addFunction('van-emde-boas', (u, entries) => {
  const v = new VEB(u);
  for (const e of entries) v.insert(e);
  for (const e of entries) v.next(e+1);
  for (const e of entries) v.delete(e);
});

suite.addFunction('vebt', (u, entries) => {
  const v = new VEBX(u);
  for (const e of entries) v.insert(e);
  for (const e of entries) v.next(e+1);
  try { for (const e of entries) v.remove(e); } catch (e) {}
});

for(const [u, s] of [
  [8, 6],
  //[16, 7],
  //[32, 16],
]) {
  const entries = [];
  const l = 2**s;
  const y = 2**u;
  for (let i = 0; i < l; i++) {
    entries.push(Math.floor((Math.random() * y)));
  }
  suite.addInput(`u=${u}, s=${s}`, [y, entries]);
}

suite.on("cycle", function (evt) {
  console.log(" - " + evt.target);
});

suite.on("complete",  () => {
  console.log('Fastest is ' + suite.filter('fastest').map('name'));
  console.log(suite.table.toString());
});

console.log("Is it really fast?");
console.log(new Array(30).join("-"));
suite.run();