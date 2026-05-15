import { useEffect, useRef } from "react";

const MAGNET_BUBBLES = [
  { id: 1, left: 6, top: 12, size: 44, phase: 0.2, driftAmp: 5, driftHz: 0.9 },
  { id: 2, left: 14, top: 38, size: 28, phase: 1.1, driftAmp: 4, driftHz: 1.1 },
  { id: 3, left: 22, top: 72, size: 36, phase: 2.4, driftAmp: 6, driftHz: 0.75 },
  { id: 4, left: 8, top: 58, size: 22, phase: 0.7, driftAmp: 3.5, driftHz: 1.2 },
  { id: 5, left: 32, top: 8, size: 40, phase: 1.8, driftAmp: 5, driftHz: 0.85 },
  { id: 6, left: 38, top: 28, size: 26, phase: 3.0, driftAmp: 4, driftHz: 1.05 },
  { id: 7, left: 35, top: 52, size: 32, phase: 0.4, driftAmp: 5.5, driftHz: 0.95 },
  { id: 8, left: 48, top: 18, size: 34, phase: 2.1, driftAmp: 4.5, driftHz: 1.15 },
  { id: 9, left: 52, top: 42, size: 24, phase: 1.4, driftAmp: 3, driftHz: 1.3 },
  { id: 10, left: 44, top: 78, size: 48, phase: 0.9, driftAmp: 6, driftHz: 0.7 },
  { id: 11, left: 58, top: 88, size: 30, phase: 2.7, driftAmp: 4, driftHz: 1.0 },
  { id: 12, left: 62, top: 6, size: 38, phase: 1.2, driftAmp: 5, driftHz: 0.88 },
  { id: 13, left: 72, top: 22, size: 42, phase: 0.5, driftAmp: 5.5, driftHz: 0.92 },
  { id: 14, left: 78, top: 48, size: 28, phase: 2.9, driftAmp: 3.5, driftHz: 1.25 },
  { id: 15, left: 88, top: 14, size: 36, phase: 1.6, driftAmp: 4.5, driftHz: 1.08 },
  { id: 16, left: 92, top: 36, size: 26, phase: 0.3, driftAmp: 3, driftHz: 1.4 },
  { id: 17, left: 84, top: 62, size: 40, phase: 2.0, driftAmp: 5, driftHz: 0.8 },
  { id: 18, left: 94, top: 78, size: 34, phase: 1.0, driftAmp: 4, driftHz: 1.12 },
  { id: 19, left: 76, top: 88, size: 22, phase: 3.2, driftAmp: 3, driftHz: 1.35 },
  { id: 20, left: 18, top: 88, size: 30, phase: 0.8, driftAmp: 4.5, driftHz: 0.98 },
  { id: 21, left: 28, top: 92, size: 24, phase: 2.3, driftAmp: 3.5, driftHz: 1.18 },
  { id: 22, left: 66, top: 34, size: 20, phase: 1.5, driftAmp: 2.5, driftHz: 1.45 },
  { id: 23, left: 4, top: 82, size: 32, phase: 2.6, driftAmp: 5, driftHz: 0.72 },
  { id: 24, left: 96, top: 52, size: 28, phase: 0.1, driftAmp: 4, driftHz: 1.05 },
  { id: 25, left: 50, top: 62, size: 36, phase: 1.9, driftAmp: 5, driftHz: 0.9 },
  { id: 26, left: 40, top: 12, size: 22, phase: 2.8, driftAmp: 3, driftHz: 1.5 },
  { id: 27, left: 56, top: 58, size: 26, phase: 0.6, driftAmp: 4, driftHz: 1.1 },
  { id: 28, left: 70, top: 72, size: 30, phase: 3.1, driftAmp: 4.5, driftHz: 0.95 },
];

/** Vibrant blue gradient bubbles: idle drift + magnet (magnet off when prefers-reduced-motion). */
function MagneticBlueBubbles() {
  const boundsRef = useRef(null);
  const bubbleRefs = useRef([]);
  const mouse = useRef({ x: -1e4, y: -1e4 });
  const offset = useRef(MAGNET_BUBBLES.map(() => ({ x: 0, y: 0 })));
  const rafId = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const THRESHOLD = reduceMotion ? 0 : 280;
    const MAX_PULL = reduceMotion ? 0 : 72;
    const LERP = reduceMotion ? 0 : 0.32;
    const driftMul = reduceMotion ? 1.15 : 1.85;
    const spdMul = reduceMotion ? 0.5 : 1.08;

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const { x: mx, y: my } = mouse.current;
      const el = boundsRef.current;
      let w = window.innerWidth;
      let h = window.innerHeight;
      let originX = 0;
      let originY = 0;
      if (el) {
        const rect = el.getBoundingClientRect();
        w = Math.max(rect.width, 1);
        h = Math.max(rect.height, 1);
        originX = rect.left;
        originY = rect.top;
      }
      const t = performance.now() * 0.001;

      MAGNET_BUBBLES.forEach((b, i) => {
        const cx = originX + (b.left / 100) * w;
        const cy = originY + (b.top / 100) * h;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);

        let tx = 0;
        let ty = 0;
        if (THRESHOLD > 0 && dist < THRESHOLD && dist > 0.5) {
          const falloff = (1 - dist / THRESHOLD) ** 1.2;
          const pull = falloff * MAX_PULL;
          tx = (dx / dist) * pull;
          ty = (dy / dist) * pull;
        }

        const o = offset.current[i];
        o.x += (tx - o.x) * LERP;
        o.y += (ty - o.y) * LERP;

        const hz = b.driftHz;
        const amp = b.driftAmp * driftMul;
        const ph = b.phase;
        const idleX = Math.sin(t * hz * spdMul + ph) * amp;
        const idleY = Math.cos(t * hz * 0.88 * spdMul + ph * 1.3) * amp * 0.9;

        const bubbleEl = bubbleRefs.current[i];
        if (bubbleEl) {
          bubbleEl.style.transform = `translate3d(${o.x + idleX}px, ${o.y + idleY}px, 0)`;
        }
      });

      rafId.current = requestAnimationFrame(tick);
    };

    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    rafId.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div ref={boundsRef} className="absolute inset-0">
      {MAGNET_BUBBLES.map((b, i) => (
        <div
          key={b.id}
          ref={(el) => {
            bubbleRefs.current[i] = el;
          }}
          className={`absolute rounded-full border backdrop-blur-[2px] will-change-transform ${
            i % 3 === 0
              ? "border-blue-400/40 bg-gradient-to-br from-blue-600/50 via-blue-500/30 to-blue-400/40"
              : i % 3 === 1
                ? "border-blue-300/30 bg-gradient-to-tr from-blue-500/40 via-blue-700/25 to-blue-300/35"
                : "border-blue-200/25 bg-gradient-to-bl from-blue-500/45 via-blue-400/20 to-blue-600/30"
          } shadow-[0_0_50px_-10px_rgba(37,99,235,0.45),0_0_30px_-5px_rgba(59,130,246,0.3)]`}
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            transform: "translate3d(0,0,0)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Magnetic bubble backdrop.
 * @param {"fixed" | "contained"} variant — `fixed`: full viewport (main app). `contained`: fills positioned parent only (e.g. login hero column).
 */
export function AmbientBackdrop({ variant = "fixed" }) {
  const wrapperClass =
    variant === "contained"
      ? "pointer-events-none absolute inset-0 z-0 overflow-hidden"
      : "pointer-events-none fixed inset-0 -z-10 overflow-hidden";

  return (
    <div className={wrapperClass} aria-hidden="true">
      <MagneticBlueBubbles />
    </div>
  );
}
