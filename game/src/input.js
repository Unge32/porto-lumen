// Keyboard and mouse, read fresh every frame. Actions are edge-triggered
// (pressed this frame), movement is level-triggered (held down).
// WASD or arrows to move/drive, mouse to aim, click to shoot, E to use,
// Shift to sprint, Space for the handbrake, Esc/P to pause, M to mute.
export const ACTION_CONFIRM = 1;
export const ACTION_USE = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_SAVE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mousePressed = false;

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      mousePressed = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(...codes) {
    return codes.some((code) => keys.has(code));
  }

  return {
    // A unit-ish movement vector from the held keys, for walking.
    move() {
      let x = 0;
      let y = 0;
      if (held('KeyA', 'ArrowLeft')) x -= 1;
      if (held('KeyD', 'ArrowRight')) x += 1;
      if (held('KeyW', 'ArrowUp')) y -= 1;
      if (held('KeyS', 'ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    drive() {
      return {
        throttle: held('KeyW', 'ArrowUp') ? 1 : 0,
        brake: held('KeyS', 'ArrowDown') ? 1 : 0,
        steer: (held('KeyA', 'ArrowLeft') ? -1 : 0) + (held('KeyD', 'ArrowRight') ? 1 : 0),
        handbrake: held('Space'),
      };
    },
    sprint() {
      return held('ShiftLeft', 'ShiftRight');
    },
    mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown, pressed: mousePressed };
    },
    takeActions() {
      let actions = 0;
      if (pressed.has('Enter') || pressed.has('Space') || mousePressed) actions |= ACTION_CONFIRM;
      if (pressed.has('KeyE')) actions |= ACTION_USE;
      if (pressed.has('Escape') || pressed.has('KeyP')) actions |= ACTION_PAUSE;
      if (pressed.has('KeyM')) actions |= ACTION_MUTE;
      if (pressed.has('KeyQ')) actions |= ACTION_SAVE;
      pressed.clear();
      mousePressed = false;
      return actions;
    },
    // Peek whether a key was pressed since the last takeActions, without
    // consuming it. Read it before takeActions, which clears the set.
    pressedCode(code) {
      return pressed.has(code);
    },
    // Clear edge state without reading it (used when switching screens).
    flush() {
      pressed.clear();
      mousePressed = false;
    },
  };
}
