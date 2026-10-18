import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ColorTheme } from '../brand/brand';
import type { QualitySettings } from '../core/quality';
import type { JourneyDirector, LiveWorld } from '../journey/JourneyDirector';
import type { TransitionType } from '../worlds/types';
import vertexShader from '../shaders/fullscreen.vert.glsl?raw';
import compositeFrag from '../shaders/composite.frag.glsl?raw';
import masterFrag from '../shaders/master.frag.glsl?raw';
import brandFrag from '../shaders/brand.frag.glsl?raw';

const TYPE_INDEX: Record<TransitionType, number> = {
  'object-interior': 0,
  'infinite-zoom-in': 0,
  'scale-revelation': 0,
  'hole-to-universe': 1,
  'mirror-passage': 1,
  'fractal-recursion': 2,
  'impossible-architecture': 2,
  'infinite-zoom-out': 2,
};

export interface PipelineFrame {
  time: number;
  delta: number;
  beat: number;
  bass: number;
  theme: ColorTheme;
  blackout: boolean;
  transitionIntensity: number;
}

/** A render target dedicated to one world slot, sized by that world's performance profile. */
class WorldSlot {
  readonly target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    samples: 0,
  });
  private owner: LiveWorld | null = null;

  render(renderer: THREE.WebGLRenderer, world: LiveWorld, width: number, height: number, scale: number): void {
    const s = scale * world.def.performance.renderScale;
    const w = Math.max(2, Math.round(width * s));
    const h = Math.max(2, Math.round(height * s));
    if (this.target.width !== w || this.target.height !== h || this.owner !== world) {
      this.target.setSize(w, h);
      world.instance.resize(w, h);
      this.owner = world;
    }
    if (world.instance.render) {
      world.instance.render(renderer, this.target);
    } else {
      renderer.setRenderTarget(this.target);
      renderer.clear();
      renderer.render(world.instance.scene, world.instance.camera);
    }
  }

  dispose(): void {
    this.target.dispose();
  }
}

/**
 * current world ─┐
 *                ├─ portal composite ─ bloom ─ master grade ─ tone map ─ brand (logo) → screen
 * next world  ───┘
 */
export class Pipeline {
  private readonly slotA = new WorldSlot();
  private readonly slotB = new WorldSlot();
  private readonly composer: EffectComposer;
  private readonly composite: ShaderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly master: ShaderPass;
  private readonly brand: ShaderPass;
  private width = 1;
  private height = 1;
  private blackout = 0;
  /** Adaptive multiplier on top of the quality preset. */
  adaptiveScale = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private quality: QualitySettings,
    logo: THREE.Texture,
  ) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    this.composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }),
    );
    this.composer.setPixelRatio(1);

    this.composite = new ShaderPass(
      {
        uniforms: {
          tCurrent: { value: null },
          tNext: { value: null },
          uAspect: { value: 1 },
          uCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uRadius: { value: 0 },
          uProgress: { value: -1 },
          uType: { value: 0 },
          uIntensity: { value: 0.6 },
          uLogo: { value: 0 },
          uLogoHalf: { value: 0.2 },
          uTime: { value: 0 },
        },
        vertexShader,
        fragmentShader: compositeFrag,
      },
      'tUnused',
    );
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.12, 0.9);
    this.master = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uLift: { value: new THREE.Vector3() },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uSaturation: { value: 1 },
        uPulse: { value: 0 },
        uBlackout: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader,
      fragmentShader: masterFrag,
    });
    this.composer.addPass(this.composite);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.master);
    this.brand = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tLogo: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uHalf: { value: 0.2 },
        uAlpha: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader,
      fragmentShader: brandFrag,
    });
    // ShaderPass clones its uniforms (textures included); point back at the shared, async-loaded logo.
    this.brand.uniforms.tLogo.value = logo;
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.brand);
    this.applyQuality();
  }

  setQuality(quality: QualitySettings): void {
    this.quality = quality;
    this.applyQuality();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.composer.setSize(width, height);
    this.applyQuality();
    const aspect = width / height;
    this.composite.uniforms.uAspect.value = aspect;
    this.master.uniforms.uAspect.value = aspect;
    this.brand.uniforms.uAspect.value = aspect;
  }

  get renderScale(): number {
    return this.quality.renderScale * this.adaptiveScale;
  }

  render(director: JourneyDirector, frame: PipelineFrame): void {
    const scale = this.renderScale;
    this.slotA.render(this.renderer, director.current, this.width, this.height, scale);
    const t = director.transition;
    const u = this.composite.uniforms;
    u.tCurrent.value = this.slotA.target.texture;
    u.uTime.value = frame.time;
    u.uIntensity.value = frame.transitionIntensity;

    if (t && director.next) {
      this.slotB.render(this.renderer, director.next, this.width, this.height, scale);
      const portal = director.current.instance.exitPortal();
      u.tNext.value = this.slotB.target.texture;
      u.uCenter.value.copy(portal.center);
      u.uRadius.value = portal.radius;
      u.uProgress.value = t.progress;
      u.uType.value = TYPE_INDEX[t.type];
      const logo = t.brandReveal
        ? THREE.MathUtils.smoothstep(t.progress, 0.08, 0.3) * (1 - THREE.MathUtils.smoothstep(t.progress, 0.55, 0.8))
        : 0;
      // Readable while the portal is still small, then grows with it (same formula as the composite shader).
      const aspect = this.width / this.height;
      const cover = Math.hypot(aspect, 1) * 0.5 + Math.hypot(portal.center.x - 0.5, portal.center.y - 0.5) * 2 + 0.05;
      const r = THREE.MathUtils.lerp(Math.max(portal.radius, 0.002), cover, THREE.MathUtils.smoothstep(t.progress, 0.55, 1));
      const half = Math.max(r * 0.85, 0.2 + 0.08 * t.progress);
      const drift = THREE.MathUtils.smoothstep(t.progress, 0.45, 1);
      u.uLogo.value = logo;
      u.uLogoHalf.value = half;
      const b = this.brand.uniforms;
      b.uAlpha.value = logo;
      b.uHalf.value = half;
      b.uCenter.value.set(THREE.MathUtils.lerp(portal.center.x, 0.5, drift), THREE.MathUtils.lerp(portal.center.y, 0.5, drift));
    } else {
      u.tNext.value = this.slotA.target.texture;
      u.uProgress.value = -1;
      u.uLogo.value = 0;
      this.brand.uniforms.uAlpha.value = 0;
    }

    // Blackout fades over ~0.8 s; never a hard cut (no flash on return either).
    const goal = frame.blackout ? 1 : 0;
    this.blackout += (goal - this.blackout) * Math.min(1, frame.delta * 4);
    const m = this.master.uniforms;
    m.uLift.value.set(...frame.theme.lift);
    m.uGain.value.set(...frame.theme.gain);
    m.uSaturation.value = frame.theme.saturation;
    m.uPulse.value = frame.beat;
    m.uBlackout.value = this.blackout;
    this.bloom.strength = 0.28 + frame.bass * 0.15;

    this.renderer.setRenderTarget(null);
    this.composer.render(frame.delta);
  }

  dispose(): void {
    this.slotA.dispose();
    this.slotB.dispose();
    this.composer.dispose();
  }

  private applyQuality(): void {
    this.bloom.enabled = this.quality.bloom;
    const s = this.quality.bloomScale;
    this.bloom.setSize(Math.max(64, Math.round(this.width * s)), Math.max(64, Math.round(this.height * s)));
  }
}
