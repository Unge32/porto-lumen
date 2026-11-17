// A small seeded random source, so the same seed always builds the same
// city and the same screenshot scenes. One stream per world, advanced only
// by the code that needs a draw, so a scene staged twice plays identically.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function nextUint() {
    // xorshift32: three shifts, one multiply-free step.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  return {
    next() {
      return nextUint() / 4294967296;
    },
    range(min, max) {
      return min + (max - min) * (nextUint() / 4294967296);
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * (nextUint() / 4294967296));
    },
    pick(list) {
      return list[Math.floor((nextUint() / 4294967296) * list.length)];
    },
    chance(p) {
      return nextUint() / 4294967296 < p;
    },
  };
}
