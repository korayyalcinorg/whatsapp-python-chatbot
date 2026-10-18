import * as THREE from 'three';
import { BRAND } from '../../brand/brand';

/** Regulation dartboard radii in millimetres. */
export const BOARD_MM = {
  innerBull: 6.35,
  outerBull: 15.9,
  trebleIn: 99,
  trebleOut: 107,
  doubleIn: 162,
  doubleOut: 170,
  board: 225.5,
} as const;

export const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Board radius 1.0 == 225.5 mm. */
export const mm = (v: number): number => v / BOARD_MM.board;

/**
 * Paints a regulation dartboard in Locale colours (emerald / burgundy scoring
 * beds instead of green / red) with sisal speckle and wire spider.
 */
export function createDartboardTextures(size: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const c = size / 2;
  const R = size / 2; // == 225.5 mm
  const px = (v: number): number => (v / BOARD_MM.board) * R;
  const seg = (Math.PI * 2) / 20;

  g.fillStyle = '#0b0b0b';
  g.fillRect(0, 0, size, size);

  const sector = (r0: number, r1: number, a0: number, a1: number, color: string): void => {
    g.beginPath();
    g.arc(c, c, px(r1), a0, a1);
    g.arc(c, c, px(r0), a1, a0, true);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };

  const black = '#141312';
  const cream = '#e9dcc0';
  for (let i = 0; i < 20; i++) {
    const mid = -Math.PI / 2 + i * seg;
    const a0 = mid - seg / 2;
    const a1 = mid + seg / 2;
    const dark = i % 2 === 0;
    const single = dark ? black : cream;
    const ring = dark ? BRAND.burgundy : BRAND.emerald;
    sector(BOARD_MM.outerBull, BOARD_MM.trebleIn, a0, a1, single);
    sector(BOARD_MM.trebleIn, BOARD_MM.trebleOut, a0, a1, ring);
    sector(BOARD_MM.trebleOut, BOARD_MM.doubleIn, a0, a1, single);
    sector(BOARD_MM.doubleIn, BOARD_MM.doubleOut, a0, a1, ring);
  }
  g.beginPath();
  g.arc(c, c, px(BOARD_MM.outerBull), 0, Math.PI * 2);
  g.fillStyle = BRAND.emerald;
  g.fill();
  g.beginPath();
  g.arc(c, c, px(BOARD_MM.innerBull), 0, Math.PI * 2);
  g.fillStyle = BRAND.burgundy;
  g.fill();

  // Sisal speckle: thousands of tiny fibre ends.
  const speckles = Math.round(size * size * 0.06);
  for (let i = 0; i < speckles; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    if ((x - c) ** 2 + (y - c) ** 2 > px(BOARD_MM.doubleOut) ** 2) continue;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
    g.fillRect(x, y, 1.2, 1.2);
  }

  // Wire spider.
  g.strokeStyle = '#cfd2d4';
  g.lineWidth = Math.max(1, size / 900);
  for (const r of [BOARD_MM.innerBull, BOARD_MM.outerBull, BOARD_MM.trebleIn, BOARD_MM.trebleOut, BOARD_MM.doubleIn, BOARD_MM.doubleOut]) {
    g.beginPath();
    g.arc(c, c, px(r), 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + i * seg + seg / 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * px(BOARD_MM.outerBull), c + Math.sin(a) * px(BOARD_MM.outerBull));
    g.lineTo(c + Math.cos(a) * px(BOARD_MM.doubleOut), c + Math.sin(a) * px(BOARD_MM.doubleOut));
    g.stroke();
  }

  // Number ring.
  g.fillStyle = '#e8e6e0';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(px(30))}px "Arial Narrow", Arial, sans-serif`;
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + i * seg;
    const r = px(197);
    g.save();
    g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r);
    g.rotate(a + Math.PI / 2);
    g.fillText(String(NUMBERS[i]), 0, 0);
    g.restore();
  }

  // Bump: fibre noise, raised wires, raised number ring rim.
  const bumpCanvas = document.createElement('canvas');
  const bs = Math.min(size, 2048);
  bumpCanvas.width = bumpCanvas.height = bs;
  const b = bumpCanvas.getContext('2d')!;
  const img = b.createImageData(bs, bs);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  b.putImageData(img, 0, 0);
  b.globalAlpha = 0.35;
  b.drawImage(canvas, 0, 0, bs, bs); // wires / numbers become slight relief
  b.globalAlpha = 1;

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = 4;
  return { map, bump };
}

/** A steel-tip dart, tip pointing towards -Z. Units: board radius 1 = 225.5 mm. */
export function createDart(materials: { steel: THREE.Material; tungsten: THREE.Material; shaft: THREE.Material; flight: THREE.Material }): THREE.Group {
  const dart = new THREE.Group();
  const s = 1 / BOARD_MM.board; // per mm

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s, 0.2 * s, 32 * s, 12), materials.steel);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 16 * s;

  // Knurled tungsten barrel from a lathe profile.
  const profile: THREE.Vector2[] = [];
  const len = 48;
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    let r = 3.2 + Math.sin(t * Math.PI) * 0.9;
    if (t > 0.2 && t < 0.75 && i % 3 === 0) r -= 0.45; // grip rings
    profile.push(new THREE.Vector2(r * s, t * len * s));
  }
  const barrel = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), materials.tungsten);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 32 * s;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * s, 2.4 * s, 40 * s, 12), materials.shaft);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = (32 + len + 20) * s;

  const flightShape = new THREE.Shape();
  flightShape.moveTo(0, 0);
  flightShape.lineTo(17 * s, 14 * s);
  flightShape.lineTo(17 * s, 36 * s);
  flightShape.lineTo(0, 42 * s);
  flightShape.closePath();
  const flightGeometry = new THREE.ShapeGeometry(flightShape);
  for (let k = 0; k < 4; k++) {
    const flight = new THREE.Mesh(flightGeometry, materials.flight);
    flight.rotation.set(Math.PI / 2, 0, 0); // shape's +Y runs back along +Z
    const holder = new THREE.Group();
    holder.add(flight);
    holder.rotation.z = (k * Math.PI) / 2;
    holder.position.z = (32 + len + 6) * s;
    dart.add(holder);
  }
  dart.add(tip, barrel, shaft);
  dart.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return dart;
}
