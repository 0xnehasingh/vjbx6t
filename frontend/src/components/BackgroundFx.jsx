import { useEffect, useRef } from "react";

// Decorative aurora background: a deep navy-to-black sky, a few dozen faint
// twinkling stars and wide, soft, undulating curtains of teal / emerald / cyan
// with a touch of violet and magenta across the upper part of the screen.
// One fixed layer behind all content; it never receives pointer events.
//
// The aurora is rendered into a low-resolution canvas (upscaled by CSS, which
// keeps it soft and cheap) by stamping pre-rendered 1px-wide gradient sprites
// column by column. Stars live on a second, full-resolution canvas.

// Each ribbon blends two colours along its length; the blend slowly travels, so the hue shifts.
const RIBBONS = [
  { a: [45, 212, 191], b: [52, 211, 153], base: 0.22, amp: 0.07, height: 0.5, alpha: 0.95, speed: 0.11, phase: 0.0 },
  { a: [34, 211, 238], b: [45, 212, 191], base: 0.3, amp: 0.08, height: 0.44, alpha: 0.8, speed: 0.09, phase: 2.1 },
  { a: [139, 92, 246], b: [217, 70, 239], base: 0.14, amp: 0.06, height: 0.4, alpha: 0.7, speed: 0.13, phase: 4.0 },
  { a: [52, 211, 153], b: [34, 211, 238], base: 0.38, amp: 0.06, height: 0.34, alpha: 0.55, speed: 0.08, phase: 5.3 },
  { a: [217, 70, 239], b: [139, 92, 246], base: 0.26, amp: 0.09, height: 0.32, alpha: 0.4, speed: 0.1, phase: 1.2 },
];

const STILL_TIME = 42; // seconds into the animation shown for reduced motion

function makeSprite([r, g, b]) {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 128;
  const x = c.getContext("2d");
  const grad = x.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
  grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.35)`);
  grad.addColorStop(0.88, `rgba(${r}, ${g}, ${b}, 1)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, 1, 128);
  return c;
}

export default function BackgroundFx() {
  const auroraRef = useRef(null);
  const starsRef = useRef(null);

  useEffect(() => {
    const aurora = auroraRef.current;
    const starsCanvas = starsRef.current;
    const actx = aurora && aurora.getContext("2d");
    const sctx = starsCanvas && starsCanvas.getContext("2d");
    if (!actx || !sctx) return undefined;

    const sprites = RIBBONS.map((r) => ({ a: makeSprite(r.a), b: makeSprite(r.b) }));
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    let w = 0;
    let h = 0;
    let colW = 6;
    let lift = 1; // phones: curtains are compressed into the top so they show around the header
    let ribbons = RIBBONS;
    let stars = [];
    let raf = 0;
    let last = 0;
    let t = STILL_TIME;

    const draw = () => {
      // Aurora (low-res canvas, drawn in CSS pixel units)
      actx.globalCompositeOperation = "source-over";
      actx.clearRect(0, 0, w, h);
      actx.globalCompositeOperation = "lighter";
      ribbons.forEach((r, i) => {
        const { a, b } = sprites[i];
        for (let x = 0; x < w + colW; x += colW) {
          const u = x / w;
          const wave =
            Math.sin(u * 5.2 + t * r.speed * 2.2 + r.phase) * 0.6 +
            Math.sin(u * 11 - t * r.speed * 3.1 + r.phase * 1.7) * 0.4;
          const yBottom = h * lift * (r.base + r.height * 0.55) + wave * h * r.amp;
          const ray = 0.72 + 0.28 * Math.sin(x * 0.045 + t * 0.55 + r.phase + Math.sin(x * 0.011 + t * 0.2) * 2);
          const envelope = 0.45 + 0.55 * Math.sin(u * 3.1 + t * r.speed + r.phase) ** 2;
          const alpha = r.alpha * ray * envelope;
          const height = h * lift * r.height * (0.75 + 0.25 * Math.sin(u * 7 + t * 0.2 + r.phase));
          const mix = 0.5 + 0.5 * Math.sin(u * 3.4 - t * 0.07 + r.phase);
          actx.globalAlpha = alpha * (1 - mix);
          actx.drawImage(a, 0, 0, 1, 128, x, yBottom - height, colW + 1, height);
          actx.globalAlpha = alpha * mix;
          actx.drawImage(b, 0, 0, 1, 128, x, yBottom - height, colW + 1, height);
        }
      });
      actx.globalAlpha = 1;

      // Stars (full-res canvas)
      sctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        sctx.fillStyle = `rgba(214, 236, 255, ${s.alpha * tw})`;
        sctx.beginPath();
        sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        sctx.fill();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      const small = w < 640;
      colW = small ? 10 : 6;
      lift = small ? 0.5 : 1;
      ribbons = small ? RIBBONS.slice(0, 3) : RIBBONS;
      // Aurora is soft, so it renders at ~half resolution and is upscaled by CSS.
      const k = dpr * 0.5;
      aurora.width = Math.max(1, Math.round(w * k));
      aurora.height = Math.max(1, Math.round(h * k));
      actx.setTransform(k, 0, 0, k, 0, 0);
      actx.imageSmoothingEnabled = true;
      starsCanvas.width = Math.round(w * dpr);
      starsCanvas.height = Math.round(h * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = small ? 22 : 44;
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() ** 1.4 * h * 0.8,
        r: 0.4 + Math.random() * 0.8,
        alpha: 0.25 + Math.random() * 0.5,
        speed: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      }));
      draw();
    };

    const frame = (now) => {
      t += Math.min((now - last) / 1000, 0.1);
      last = now;
      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || reduced || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = (e) => {
      reduced = e.matches;
      if (reduced) {
        stop();
        t = STILL_TIME;
        draw();
      } else {
        start();
      }
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", onMotion);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div className="bg-fx" aria-hidden="true">
      <canvas ref={starsRef} className="bg-fx-canvas" />
      <canvas ref={auroraRef} className="bg-fx-canvas" />
      <div className="bg-fx-shade" />
    </div>
  );
}
