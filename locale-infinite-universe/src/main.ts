import { OutputApp } from './app/OutputApp';

// Exposed for console debugging on the LED PC (e.g. localeUniverse.director.history).
(window as unknown as { localeUniverse: OutputApp }).localeUniverse = new OutputApp(document.getElementById('stage')!);
