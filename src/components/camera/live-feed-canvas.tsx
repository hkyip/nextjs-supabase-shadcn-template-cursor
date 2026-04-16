"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// LiveFeedCanvas — procedural mock of an overhead kitchen security camera.
// Renders a believable scene (cooking surface, food items, rising steam,
// heat shimmer, video grain) so the Camera Monitoring demo has a live feed
// underneath the AI bounding boxes without shipping any video assets.
// ---------------------------------------------------------------------------

// Logical coordinate regions match the bounding boxes in camera-feed.tsx so
// the simulated food sits exactly inside what the overlay says it detected.
const REGIONS = {
  chicken: { x: 0.08, y: 0.15, w: 0.28, h: 0.3 },
  fries: { x: 0.4, y: 0.2, w: 0.22, h: 0.25 },
  pie: { x: 0.66, y: 0.18, w: 0.26, h: 0.28 },
  hotHold: { x: 0.05, y: 0.58, w: 0.9, h: 0.35 },
} as const;

type SteamParticle = {
  x: number; // pixels
  y: number;
  vy: number;
  radius: number;
  life: number; // 0..1
  maxLife: number;
};

// Precomputed, resize-stable layouts so the procedural scene doesn't strobe
// on every animation frame. Positions are in pixel space.
type HotHoldItem = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  color: string;
};

type FryPiece = {
  px: number;
  py: number;
  rot: number;
  len: number;
};

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function drawCountertop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1c1f24");
  grad.addColorStop(0.55, "#141619");
  grad.addColorStop(1, "#0d0f12");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Faint tile grid to sell the overhead-camera perspective.
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  const tile = Math.max(32, Math.round(w / 24));
  ctx.beginPath();
  for (let x = 0; x <= w; x += tile) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += tile) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

function drawCookingSurface(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Dark metallic cooking surface that spans the three cook stations.
  const sx = 0.04 * w;
  const sy = 0.08 * h;
  const sw = 0.92 * w;
  const sh = 0.4 * h;
  const r = 10;

  ctx.save();
  const grad = ctx.createLinearGradient(0, sy, 0, sy + sh);
  grad.addColorStop(0, "#2a2d33");
  grad.addColorStop(1, "#15171b");
  ctx.fillStyle = grad;
  roundRect(ctx, sx, sy, sw, sh, r);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function buildHotHoldLayout(w: number, h: number): HotHoldItem[] {
  const { x, y, width, height } = scale(REGIONS.hotHold, w, h);
  const slots = 6;
  const pad = 10;
  const slotW = (width - pad * (slots + 1)) / slots;
  const slotH = height - pad * 2;
  const items: HotHoldItem[] = [];
  for (let i = 0; i < slots; i++) {
    const sx = x + pad + i * (slotW + pad);
    const sy = y + pad;
    const count = 2 + (i % 3);
    for (let k = 0; k < count; k++) {
      items.push({
        cx: sx + rand(8, slotW - 8),
        cy: sy + rand(8, slotH - 8),
        rx: rand(5, 9),
        ry: rand(4, 7),
        rot: rand(0, Math.PI),
        color: i % 2 === 0 ? "#caa066" : "#d9b36b",
      });
    }
  }
  return items;
}

function drawHotHold(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  items: HotHoldItem[],
): void {
  const { x, y, width, height } = scale(REGIONS.hotHold, w, h);
  // Stainless steel hot-hold counter with individually lit compartments.
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, "#23262c");
  grad.addColorStop(1, "#0f1114");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();

  const slots = 6;
  const pad = 10;
  const slotW = (width - pad * (slots + 1)) / slots;
  const slotH = height - pad * 2;
  for (let i = 0; i < slots; i++) {
    const sx = x + pad + i * (slotW + pad);
    const sy = y + pad;

    const g = ctx.createLinearGradient(0, sy, 0, sy + slotH);
    g.addColorStop(0, "#0a0b0d");
    g.addColorStop(1, "#1b1d21");
    ctx.fillStyle = g;
    roundRect(ctx, sx, sy, slotW, slotH, 4);
    ctx.fill();

    // Warm amber glow from the heat lamp.
    const glow = ctx.createRadialGradient(
      sx + slotW / 2,
      sy + slotH / 2,
      2,
      sx + slotW / 2,
      sy + slotH / 2,
      Math.max(slotW, slotH) / 1.2,
    );
    glow.addColorStop(0, "rgba(255, 170, 60, 0.28)");
    glow.addColorStop(1, "rgba(255, 170, 60, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sx, sy, slotW, slotH);
  }

  // Draw the pre-positioned items once the slots are painted.
  for (const item of items) {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.ellipse(item.cx, item.cy, item.rx, item.ry, item.rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChickenRegion(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const { x, y, width, height } = scale(REGIONS.chicken, w, h);
  // 2x4 grid of fried chicken pieces, crispy golden-brown.
  const cols = 4;
  const rows = 2;
  const cellW = width / cols;
  const cellH = height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + c * cellW + cellW / 2;
      const cy = y + r * cellH + cellH / 2;
      // Subtle "sizzle" wobble driven by time.
      const wobble = Math.sin(t / 400 + r * 2 + c) * 0.6;
      ctx.save();
      ctx.translate(cx, cy + wobble);

      // Crust highlight.
      const grad = ctx.createRadialGradient(0, -2, 2, 0, 0, cellW / 2);
      grad.addColorStop(0, "#e4a85a");
      grad.addColorStop(0.55, "#a66a2c");
      grad.addColorStop(1, "#5c3714");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, cellW * 0.38, cellH * 0.36, (r + c) * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Specular glint to hint at oil / steam.
      ctx.fillStyle = "rgba(255, 230, 180, 0.18)";
      ctx.beginPath();
      ctx.ellipse(-cellW * 0.08, -cellH * 0.1, cellW * 0.12, cellH * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function buildFriesLayout(w: number, h: number): FryPiece[] {
  const { x, y, width, height } = scale(REGIONS.fries, w, h);
  const count = 42;
  const pieces: FryPiece[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 37) % 360;
    const px =
      x + width * 0.5 + Math.cos((angle * Math.PI) / 180) * rand(0, width * 0.35);
    const py =
      y + height * 0.55 + Math.sin((angle * Math.PI) / 180) * rand(0, height * 0.32);
    pieces.push({
      px,
      py,
      rot: ((i * 53) % 180) * (Math.PI / 180),
      len: rand(width * 0.12, width * 0.22),
    });
  }
  return pieces;
}

function drawFriesRegion(
  ctx: CanvasRenderingContext2D,
  h: number,
  pieces: FryPiece[],
): void {
  const thick = Math.max(2, h * REGIONS.fries.h * 0.035);
  for (const piece of pieces) {
    ctx.save();
    ctx.translate(piece.px, piece.py);
    ctx.rotate(piece.rot);
    const grad = ctx.createLinearGradient(0, -thick, 0, thick);
    grad.addColorStop(0, "#f5d86a");
    grad.addColorStop(1, "#b88525");
    ctx.fillStyle = grad;
    roundRect(ctx, -piece.len / 2, -thick / 2, piece.len, thick, thick / 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPieRegion(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const { x, y, width, height } = scale(REGIONS.pie, w, h);
  // 3 turnover-style hand pies in a triangular arrangement.
  const positions: Array<[number, number]> = [
    [x + width * 0.3, y + height * 0.35],
    [x + width * 0.7, y + height * 0.35],
    [x + width * 0.5, y + height * 0.72],
  ];
  for (const [cx, cy] of positions) {
    ctx.save();
    ctx.translate(cx, cy);
    const rad = Math.min(width, height) * 0.22;

    const grad = ctx.createRadialGradient(0, -rad * 0.3, rad * 0.2, 0, 0, rad);
    grad.addColorStop(0, "#f1c87a");
    grad.addColorStop(0.6, "#c08a3a");
    grad.addColorStop(1, "#6b3f13");
    ctx.fillStyle = grad;

    // Rectangular turnover with rounded corners.
    roundRect(ctx, -rad, -rad * 0.7, rad * 2, rad * 1.4, rad * 0.25);
    ctx.fill();

    // Crimped edge hatching.
    ctx.strokeStyle = "rgba(60, 30, 8, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      const px = i * (rad * 0.25);
      ctx.moveTo(px, -rad * 0.7);
      ctx.lineTo(px + rad * 0.08, -rad * 0.55);
      ctx.moveTo(px, rad * 0.7);
      ctx.lineTo(px + rad * 0.08, rad * 0.55);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function scale(
  region: { x: number; y: number; w: number; h: number },
  w: number,
  h: number,
) {
  return {
    x: region.x * w,
    y: region.y * h,
    width: region.w * w,
    height: region.h * h,
  };
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Cheap per-frame noise: sparse bright pixels rather than a full ImageData
  // pass, which is far too slow at high DPR.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#ffffff";
  const dots = Math.round((w * h) / 1400);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function LiveFeedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<SteamParticle[]>([]);
  const hotHoldRef = useRef<HotHoldItem[]>([]);
  const friesRef = useRef<FryPiece[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Rebuild static layouts whenever pixel dimensions change. This is the
      // only place randomness is sampled — the render loop re-uses the result.
      hotHoldRef.current = buildHotHoldLayout(w, h);
      friesRef.current = buildFriesLayout(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawnSteam = (now: number) => {
      // Emit steam from each cooking region at a steady rate.
      const sources: Array<{ cx: number; cy: number }> = [
        {
          cx: (REGIONS.chicken.x + REGIONS.chicken.w / 2) * w,
          cy: (REGIONS.chicken.y + REGIONS.chicken.h * 0.1) * h,
        },
        {
          cx: (REGIONS.fries.x + REGIONS.fries.w / 2) * w,
          cy: (REGIONS.fries.y + REGIONS.fries.h * 0.1) * h,
        },
        {
          cx: (REGIONS.pie.x + REGIONS.pie.w / 2) * w,
          cy: (REGIONS.pie.y + REGIONS.pie.h * 0.1) * h,
        },
      ];
      for (const s of sources) {
        if (Math.random() < 0.55) {
          const maxLife = rand(1400, 2400);
          particlesRef.current.push({
            x: s.cx + rand(-20, 20),
            y: s.cy + rand(-6, 6),
            vy: rand(-0.35, -0.2),
            radius: rand(8, 18),
            life: 0,
            maxLife,
          });
        }
      }
      // Cap particle budget.
      if (particlesRef.current.length > 120) {
        particlesRef.current.splice(0, particlesRef.current.length - 120);
      }
      // Silence unused-variable warning for `now`; kept for future easing.
      void now;
    };

    const drawSteam = (dt: number) => {
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.y += p.vy * dt * 0.06;
        p.x += Math.sin(p.life / 200) * 0.3;
        p.radius += dt * 0.01;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, 0.25 * (1 - p.life / p.maxLife));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let last = performance.now();
    let flicker = 1;

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      // Occasional subtle brightness flicker — security-camera feel.
      flicker += (1 - flicker) * 0.08;
      if (Math.random() < 0.03) flicker = rand(0.9, 1.05);

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      drawCountertop(ctx, w, h);
      drawCookingSurface(ctx, w, h);

      ctx.save();
      ctx.globalAlpha = flicker;
      drawChickenRegion(ctx, w, h, now);
      drawFriesRegion(ctx, h, friesRef.current);
      drawPieRegion(ctx, w, h);
      drawHotHold(ctx, w, h, hotHoldRef.current);
      ctx.restore();

      spawnSteam(now);
      drawSteam(dt);

      drawVignette(ctx, w, h);
      drawGrain(ctx, w, h);

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
