// Porto Lumen — keyboard + mouse: satu tempat untuk semua input.
// main.js membaca objek ini tiap frame; tidak ada logika game di sini.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.clicked = false; // klik yang terjadi sejak frame lalu (latch)
    this.pressed = new Set(); // tombol yang baru ditekan sejak frame lalu
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.clicked = true;
      }
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // true sekali saja pada frame tombol ditekan; konsumsi setelah dibaca.
  wasPressed(name) {
    return this.pressed.has(name);
  }

  // true sekali saja pada frame klik mouse terjadi; konsumsi setelah dibaca.
  wasClicked() {
    return this.clicked;
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
