import { AudioInput } from './audio/AudioInput';
import { Engine } from './core/Engine';
import { resolveProfile } from './core/profiles';
import { SceneManager } from './core/SceneManager';
import { InfiniteZoomScene } from './scenes/InfiniteZoomScene';
import { Hud, type HudState } from './ui/Hud';

const params = new URLSearchParams(window.location.search);
const profile = resolveProfile(params);
const container = document.getElementById('stage')!;

const engine = new Engine(container, profile);
const audio = new AudioInput();
if (params.get('audio') === 'off') audio.source = 'off';

const state: HudState = {
  speed: Number.parseFloat(params.get('speed') ?? '') || 1,
};

const scenes = new SceneManager(engine.renderer);
scenes.register('infinite-zoom', () => new InfiniteZoomScene());
scenes.show(params.get('scene') ?? 'infinite-zoom');
engine.onResize((w, h) => scenes.resize(w, h));

new Hud(engine, audio, profile, state);

engine.start((time, delta) => {
  const features = audio.update(time, delta);
  scenes.render({ time, delta, audio: features, speed: state.speed });
});
