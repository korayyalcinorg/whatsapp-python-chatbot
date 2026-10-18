import * as THREE from 'three';
import { log } from './Logger';

/**
 * Shared, reference-counted textures. Worlds come and go every minute during
 * a night; heavy assets (logo, generated dartboard) are created once and kept.
 */
export class AssetCache {
  private readonly textures = new Map<string, { texture: THREE.Texture; refs: number }>();
  private readonly loader = new THREE.TextureLoader();

  acquire(key: string, create: () => THREE.Texture): THREE.Texture {
    const hit = this.textures.get(key);
    if (hit) {
      hit.refs++;
      return hit.texture;
    }
    const texture = create();
    this.textures.set(key, { texture, refs: 1 });
    return texture;
  }

  load(key: string, url: string, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace): THREE.Texture {
    return this.acquire(key, () => {
      // Start from a 1x1 transparent placeholder so shaders can bind it before the image arrives.
      const placeholder = document.createElement('canvas');
      placeholder.width = placeholder.height = 1;
      const texture = new THREE.Texture<HTMLCanvasElement | HTMLImageElement>(placeholder);
      texture.colorSpace = colorSpace;
      texture.needsUpdate = true;
      this.loader.load(
        url,
        (loaded) => {
          texture.image = loaded.image;
          texture.anisotropy = 4;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
        },
        undefined,
        (err) => log.error(`Texture ${url}`, err),
      );
      return texture;
    });
  }

  /** Drop a reference. Textures stay cached (cheap to keep, costly to rebuild) unless purge() is called. */
  release(key: string): void {
    const hit = this.textures.get(key);
    if (hit) hit.refs = Math.max(0, hit.refs - 1);
  }

  purgeUnused(): void {
    for (const [key, hit] of this.textures) {
      if (hit.refs === 0) {
        hit.texture.dispose();
        this.textures.delete(key);
      }
    }
  }

  get size(): number {
    return this.textures.size;
  }
}
