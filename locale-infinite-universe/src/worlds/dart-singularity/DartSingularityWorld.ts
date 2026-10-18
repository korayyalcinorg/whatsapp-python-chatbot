import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BRAND } from '../../brand/brand';
import { projectPortal } from '../portal';
import type { PortalScreen, WorldCreateContext, WorldFrame, WorldInstance } from '../types';
import { BOARD_MM, createDart, createDartboardTextures, mm } from './dartboard';

interface Variant {
  neonA: string;
  neonB: string;
  neonGain: number;
  spot: number;
}

const VARIANTS: Variant[] = [
  { neonA: BRAND.emeraldNeon, neonB: BRAND.burgundyNeon, neonGain: 2.2, spot: 45 },
  { neonA: BRAND.emeraldNeon, neonB: BRAND.emeraldNeon, neonGain: 2.8, spot: 30 },
  { neonA: BRAND.beerGold, neonB: BRAND.burgundyNeon, neonGain: 2.4, spot: 40 },
];

const RING_COUNT = 14;
const TUNNEL_LENGTH = 11;
const MAX_DARTS = 7;
const BULL_PORTAL = mm(BOARD_MM.outerBull);

interface FlyingDart {
  object: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number; // 0..1 flight, >1 stuck
  tilt: THREE.Euler;
}

/**
 * Dart Singularity: a neon ring tunnel ending in a slowly turning dartboard.
 * Darts thud in on the beat; the bullseye collapses into the next universe.
 */
export class DartSingularityWorld implements WorldInstance {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.005, 60);

  private readonly board: THREE.Group;
  private readonly rings: THREE.Mesh[] = [];
  private readonly ringMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly neonLights: THREE.PointLight[] = [];
  private readonly darts: FlyingDart[] = [];
  private readonly dartMaterials: THREE.Material[];
  private readonly bullGlow: THREE.Mesh;
  private readonly envTarget: THREE.WebGLRenderTarget;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly portalCenter = new THREE.Vector3(0, 0, 0);
  private readonly variant: Variant;
  private readonly releaseTextures: () => void;
  private readonly rand: () => number;
  private nextThrow = 1.2;
  private shake = 0;
  private boardAngle = 0;

  constructor(ctx: WorldCreateContext) {
    let seed = ctx.seed || 7;
    this.rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.variant = VARIANTS[ctx.variant % VARIANTS.length];
    this.scene.background = new THREE.Color(BRAND.nightBlack);
    this.scene.fog = new THREE.FogExp2(0x020403, 0.06);

    // Image-based lighting for metal darts and the glossy tunnel.
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    const room = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.06;

    // Board.
    const size = ctx.quality.textureSize;
    const key = `dartboard-${size}`;
    let textures: ReturnType<typeof createDartboardTextures> | null = null;
    const map = ctx.assets.acquire(`${key}-map`, () => (textures ??= createDartboardTextures(size)).map);
    const bump = ctx.assets.acquire(`${key}-bump`, () => (textures ??= createDartboardTextures(size)).bump);
    this.releaseTextures = () => {
      ctx.assets.release(`${key}-map`);
      ctx.assets.release(`${key}-bump`);
    };
    this.board = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(1, 128),
      new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.82, metalness: 0.0 }),
    );
    face.receiveShadow = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.035, 16, 128),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.35, metalness: 0.6 }),
    );
    const cabinet = new THREE.Mesh(
      new THREE.CylinderGeometry(1.03, 1.06, 0.12, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }),
    );
    cabinet.rotation.x = Math.PI / 2;
    cabinet.position.z = -0.06;
    this.board.add(face, rim, cabinet);
    this.scene.add(this.board);
    this.disposables.push(face.geometry, face.material as THREE.Material, rim.geometry, rim.material as THREE.Material, cabinet.geometry, cabinet.material as THREE.Material);

    // Portal cue: a thin ring of light around the bull that brightens before the dive.
    this.bullGlow = new THREE.Mesh(
      new THREE.RingGeometry(BULL_PORTAL * 0.98, BULL_PORTAL * 1.12, 96),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.beerGold), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.bullGlow.position.z = 0.003;
    this.board.add(this.bullGlow);
    this.disposables.push(this.bullGlow.geometry, this.bullGlow.material as THREE.Material);

    // Neon arc tunnel.
    const ringGeometry = new THREE.TorusGeometry(1, 0.012, 8, 160, Math.PI * 2);
    this.disposables.push(ringGeometry);
    for (let i = 0; i < RING_COUNT; i++) {
      const color = new THREE.Color(i % 2 === 0 ? this.variant.neonA : this.variant.neonB);
      const material = new THREE.MeshBasicMaterial({ color });
      const arc = new THREE.Mesh(ringGeometry, material);
      arc.userData.base = color.clone();
      arc.userData.spin = (this.rand() - 0.5) * 0.4;
      this.rings.push(arc);
      this.ringMaterials.push(material);
      this.scene.add(arc);
      this.disposables.push(material);
    }
    const tunnel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, TUNNEL_LENGTH + 4, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x020302, roughness: 0.22, metalness: 0.85, side: THREE.BackSide }),
    );
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = TUNNEL_LENGTH / 2 - 1;
    this.scene.add(tunnel);
    this.disposables.push(tunnel.geometry, tunnel.material as THREE.Material);

    // Lights: warm key spot on the board + travelling neon point lights.
    const spot = new THREE.SpotLight(0xffe2b8, this.variant.spot, 12, 0.42, 0.65, 1.6);
    spot.position.set(0.9, 2.4, 3.8);
    spot.target = this.board;
    if (ctx.quality.shadows) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0004;
      ctx.renderer.shadowMap.enabled = true;
      ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.scene.add(spot);
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(i === 1 ? this.variant.neonB : this.variant.neonA, 4, 6, 1.6);
      this.neonLights.push(light);
      this.scene.add(light);
    }
    this.scene.add(new THREE.AmbientLight(0x1a2a20, 0.4));

    // Darts.
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.25 });
    const tungsten = new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: 1, roughness: 0.32 });
    const shaft = new THREE.MeshStandardMaterial({ color: new THREE.Color(BRAND.burgundy), roughness: 0.4, metalness: 0.1 });
    const flight = new THREE.MeshStandardMaterial({ color: new THREE.Color(BRAND.emerald), roughness: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(BRAND.emerald), emissiveIntensity: 0.15 });
    this.dartMaterials = [steel, tungsten, shaft, flight];
    for (let i = 0; i < MAX_DARTS; i++) {
      const object = createDart({ steel, tungsten, shaft, flight });
      object.visible = false;
      this.board.add(object);
      this.darts.push({ object, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 2, tilt: new THREE.Euler() });
    }
    // Three darts already in the board when we arrive.
    for (let i = 0; i < 3; i++) this.throwDart(true);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update({ time, delta, audio, energy, speed, exitProgress }: WorldFrame): void {
    const p = exitProgress ?? 0;

    // Board turns slowly; faster with energy.
    this.boardAngle += delta * (0.05 + energy * 0.12) * speed * (1 - p * 0.8);
    this.board.rotation.z = this.boardAngle;

    // Throw on the beat (rate-limited), never while diving.
    this.nextThrow -= delta;
    if (exitProgress === null && this.nextThrow <= 0 && (audio.beat > 0.3 || this.nextThrow < -2.5)) {
      this.throwDart(false);
      this.nextThrow = THREE.MathUtils.lerp(3.2, 1.1, energy) / speed;
    }
    for (const dart of this.darts) {
      if (dart.t < 1) this.animateDart(dart, delta, speed);
      else if (dart.object.visible) this.placeDart(dart, 1);
    }
    this.shake = Math.max(0, this.shake - delta * 3);

    // Neon rings: travel towards the camera to suggest forward motion, pulse with bass.
    const travel = time * (0.25 + energy * 0.5) * speed;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const z = 0.25 + (((i / this.rings.length) * TUNNEL_LENGTH + travel) % TUNNEL_LENGTH);
      const radius = 1.25 + 0.08 * Math.sin(i * 1.7) + z * 0.035;
      ring.position.set(0, 0, z);
      ring.scale.setScalar(radius);
      ring.rotation.z = time * ring.userData.spin;
      const fade = THREE.MathUtils.smoothstep(z, 0.1, 0.8) * (1 - THREE.MathUtils.smoothstep(z, TUNNEL_LENGTH - 2, TUNNEL_LENGTH));
      const pulse = this.variant.neonGain * (0.7 + audio.bass * 0.8 + (i % 4 === Math.floor(time * 2) % 4 ? audio.beat * 0.6 : 0));
      this.ringMaterials[i].color.copy(ring.userData.base).multiplyScalar(pulse * fade);
    }
    for (let i = 0; i < this.neonLights.length; i++) {
      const a = time * 0.4 + (i * Math.PI * 2) / 3;
      this.neonLights[i].position.set(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0.8 + ((i * 2.5 + travel * 2) % 6));
      this.neonLights[i].intensity = 0.8 + audio.bass * 1.6;
    }

    // Camera: spiral approach down the tunnel, then a dive into the bull.
    const cruiseZ = 1.7 + 3.6 * Math.exp(-time * 0.085 * speed);
    const orbit = 0.28 * Math.min(1, cruiseZ / 4);
    const a = time * 0.23 * speed;
    const cruise = new THREE.Vector3(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.7, cruiseZ);
    const dive = p * p * (3 - 2 * p);
    const target = new THREE.Vector3(0, 0, 0.045);
    this.camera.position.copy(cruise).lerp(target, dive);
    if (this.shake > 0) this.camera.position.add(new THREE.Vector3((this.rand() - 0.5) * this.shake * 0.01, (this.rand() - 0.5) * this.shake * 0.01, 0));
    this.camera.up.set(Math.sin(time * 0.1) * 0.15, 1, 0).normalize();
    this.camera.lookAt(0, 0, 0);

    const glow = this.bullGlow.material as THREE.MeshBasicMaterial;
    glow.opacity = Math.min(1, p * 4) * 0.9 + audio.beat * 0.15;
  }

  exitPortal(): PortalScreen {
    return projectPortal(this.camera, this.portalCenter, BULL_PORTAL);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    const dartGeometries = new Set<THREE.BufferGeometry>();
    for (const dart of this.darts) {
      dart.object.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) dartGeometries.add((o as THREE.Mesh).geometry);
      });
    }
    dartGeometries.forEach((g) => g.dispose());
    this.dartMaterials.forEach((m) => m.dispose());
    this.envTarget.dispose();
    this.releaseTextures();
  }

  private throwDart(instant: boolean): void {
    const dart = this.darts.find((d) => !d.object.visible) ?? this.darts.reduce((a, b) => (a.t > b.t ? a : b));
    // Aim for trebles / doubles / singles, never the bull (it is the portal).
    const r = THREE.MathUtils.lerp(mm(30), mm(165), Math.sqrt(this.rand()));
    const ang = this.rand() * Math.PI * 2;
    dart.to.set(Math.cos(ang) * r, Math.sin(ang) * r, -mm(6)); // tip sunk 6 mm into the sisal
    dart.from.set(dart.to.x * 0.2 + (this.rand() - 0.5) * 0.6, dart.to.y * 0.2 - 0.4, 5.5);
    dart.tilt.set((this.rand() - 0.5) * 0.25, (this.rand() - 0.5) * 0.25, this.rand() * Math.PI);
    dart.t = instant ? 2 : 0;
    dart.object.visible = true;
    this.placeDart(dart, instant ? 1 : 0);
  }

  private animateDart(dart: FlyingDart, delta: number, speed: number): void {
    if (!dart.object.visible || dart.t >= 1) return;
    dart.t = Math.min(1, dart.t + (delta * speed) / 0.42);
    this.placeDart(dart, dart.t);
    if (dart.t >= 1) this.shake = 1;
  }

  private placeDart(dart: FlyingDart, t: number): void {
    // `from` is in tunnel space, `to` is on the (rotating) board, so stuck darts turn with it.
    const zAxis = new THREE.Vector3(0, 0, 1);
    const target = dart.to.clone().applyAxisAngle(zAxis, this.boardAngle);
    const world = new THREE.Vector3().lerpVectors(dart.from, target, t);
    world.y += Math.sin(t * Math.PI) * 0.25;
    dart.object.position.copy(world.applyAxisAngle(zAxis, -this.boardAngle));
    dart.object.rotation.copy(dart.tilt);
    if (t < 1) dart.object.rotation.z += t * 6; // spin in flight
  }
}
