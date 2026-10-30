import { useEffect, useRef } from "react";

// Decorative wind-flow background: a slowly drifting teal/navy gradient (pure CSS)
// plus a small canvas of soft streaks drifting left to right. One fixed layer
// behind all content; it never receives pointer events.
const STREAK_COLORS = ["45, 212, 191", "56, 189, 248", "148, 220, 232"];

function makeStreak(w, h, scatterX) {
  const speed = 18 + Math.random() * 38; // px per second
  return {
    x: scatterX ? Math.random() * (w + 200) - 200 : -(40 + Math.random() * 200),
    y: Math.random() * h,
    len: 50 + Math.random() * 130,
    speed,
    sway: 4 + Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    width: 0.7 + Math.random() * 1.1,
    alpha: 0.05 + Math.random() * 0.09,
    color: STREAK_COLORS[(Math.random() * STREAK_COLORS.length) | 0],
  };
}

export default function BackgroundFx() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    let w = 0;
    let h = 0;
    let streaks = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 640 ? 18 : w < 1024 ? 36 : 56;
      if (streaks.length > count) streaks.length = count;
      while (streaks.length < count) streaks.push(makeStreak(w, h, true));
      if (!raf) draw(performance.now(), true);
    };

    const draw = (now, staticFrame) => {
      const dt = staticFrame ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (const s of streaks) {
        s.x += s.speed * dt;
        if (s.x - s.len > w) Object.assign(s, makeStreak(w, h, false));
        const y = s.y + Math.sin(now / 2600 + s.phase) * s.sway;
        const g = ctx.createLinearGradient(s.x - s.len, 0, s.x, 0);
        g.addColorStop(0, `rgba(${s.color}, 0)`);
        g.addColorStop(1, `rgba(${s.color}, ${s.alpha})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x - s.len, y);
        ctx.lineTo(s.x, y);
        ctx.stroke();
      }
    };

    const frame = (now) => {
      draw(now, false);
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
        ctx.clearRect(0, 0, w, h);
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
      <div className="bg-fx-gradient" />
      <canvas ref={canvasRef} className="bg-fx-canvas" />
    </div>
  );
}
