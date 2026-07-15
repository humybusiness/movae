import polygonClipping, { type Ring as PCRing } from "polygon-clipping";

// Contour unifié : on approxime chaque volume du corps (capsules effilées,
// cercles) en polygone, on FUSIONNE le tout (union booléenne), et on trace
// UNE seule ligne lissée autour du résultat — le corps devient un seul trait,
// sans superposition de formes visibles.

export type P = { x: number; y: number };
type Ring = [number, number][];

// Capsule effilée a→b (rayons r1/r2), approximée en polygone.
export function seg(a: P, b: P, r1: number, r2 = r1, caps = 9): Ring {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const th = Math.atan2(dy, dx);
  const pts: Ring = [];
  for (let i = 0; i <= caps; i++) {
    const ang = th + Math.PI / 2 + (Math.PI * i) / caps;
    pts.push([a.x + Math.cos(ang) * r1, a.y + Math.sin(ang) * r1]);
  }
  for (let i = 0; i <= caps; i++) {
    const ang = th - Math.PI / 2 + (Math.PI * i) / caps;
    pts.push([b.x + Math.cos(ang) * r2, b.y + Math.sin(ang) * r2]);
  }
  void len;
  return pts;
}

export function circle(c: P, r: number, n = 24): Ring {
  const pts: Ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r]);
  }
  return pts;
}

// Ellipse orientée (pour chaussures, paumes...).
export function ellipse(c: P, rx: number, ry: number, rotDeg = 0, n = 22): Ring {
  const rot = (rotDeg * Math.PI) / 180;
  const pts: Ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([c.x + x * Math.cos(rot) - y * Math.sin(rot), c.y + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

// Union → chemin SVG lissé (quadratiques par points milieux).
export function unionPath(parts: Ring[]): string {
  if (parts.length === 0) return "";
  let merged;
  try {
    const polys = parts.map((r) => [[...r, r[0]] as PCRing] as [PCRing]);
    merged = polygonClipping.union(polys[0], ...polys.slice(1));
  } catch {
    return "";
  }
  let d = "";
  for (const poly of merged) {
    for (const ring of poly) {
      const pts = ring.slice(0, ring.length - 1);
      const n = pts.length;
      if (n < 3) continue;
      const mid = (i: number): [number, number] => {
        const a = pts[i % n], b = pts[(i + 1) % n];
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      };
      const m0 = mid(0);
      d += `M${m0[0].toFixed(1)} ${m0[1].toFixed(1)} `;
      for (let i = 1; i <= n; i++) {
        const p = pts[i % n];
        const m = mid(i);
        d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)} `;
      }
      d += "Z ";
    }
  }
  return d.trim();
}
