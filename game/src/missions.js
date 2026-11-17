// The story of Porto Lumen: Dario Venn, new in town and broke, works his
// way up for Mara Solis, who runs the garage on the north side. Five jobs,
// each one hotter than the last. A mission is a list of steps; the game
// watches the steps and pays out when the last one lands.
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    brief: 'Mara needs a car and she does not ask where it came from. Steal any car, then bring it to her garage.',
    reward: 300,
    steps: [
      { kind: 'steal', text: 'Steal a car — walk up to one and press E' },
      { kind: 'goto', x: 450, y: 450, name: "Mara's Garage", radius: 90, text: 'Drive the car to Mara\'s Garage' },
    ],
  },
  {
    id: 'the-pickup',
    title: 'The Pickup',
    brief: 'A package is waiting at the docks. Go get it on foot — and be ready, the docks are watched.',
    reward: 500,
    steps: [
      { kind: 'goto', x: 3150, y: 2850, name: 'Porto Lumen Docks', radius: 90, text: 'Get to the docks' },
      { kind: 'pickup', x: 3150, y: 2850, name: 'The Package', radius: 60, hold: 1.2, text: 'Grab the package — stand in the circle', wanted: 2 },
      { kind: 'goto', x: 450, y: 450, name: "Mara's Garage", radius: 90, text: 'Bring the package back to Mara' },
    ],
  },
  {
    id: 'clear-the-plaza',
    title: 'Clear the Plaza',
    brief: 'The Vipers took Plaza del Sol and they are not leaving on their own. Take it back, Dario. All of them.',
    reward: 700,
    steps: [
      { kind: 'goto', x: 1738, y: 1738, name: 'Plaza del Sol', radius: 140, text: 'Reach Plaza del Sol', spawn: 5 },
      { kind: 'kill', count: 5, x: 1738, y: 1738, name: 'Plaza del Sol', radius: 200, text: 'Take down the Vipers: 0 / 5' },
    ],
  },
  {
    id: 'the-getaway',
    title: 'The Getaway',
    brief: 'Mara has to disappear for a while and you are driving. Pick her up, keep the car alive, and do not stop for anyone.',
    reward: 1000,
    steps: [
      { kind: 'goto', x: 450, y: 450, name: "Mara's Garage", radius: 90, text: 'Pick Mara up at the garage', wanted: 3, needCar: true },
      { kind: 'goto', x: 2850, y: 2850, name: 'Marina Safehouse', radius: 90, text: 'Drive Mara to the Marina Safehouse', needCar: true },
    ],
  },
  {
    id: 'king-of-the-bay',
    title: 'King of the Bay',
    brief: 'The Viper boss is showing off his armored car by the docks. Wreck it, then vanish down the pier. Finish this and the bay is yours.',
    reward: 1500,
    steps: [
      { kind: 'destroy', x: 3150, y: 2850, name: 'Porto Lumen Docks', radius: 260, text: 'Wreck the boss car', spawnBoss: true },
      { kind: 'goto', x: 3150, y: 3150, name: 'South Pier', radius: 90, text: 'Escape to the South Pier' },
    ],
  },
];

// Where a step's marker sits on the map, for the HUD and the minimap.
export function stepMarker(step) {
  if (step.x !== undefined) return { x: step.x, y: step.y, name: step.name || '' };
  return null;
}

// Human text for a step, with live counts filled in.
export function stepText(step, state) {
  if (step.kind === 'kill') return `Take down the Vipers: ${state.kills} / ${step.count}`;
  return step.text;
}
