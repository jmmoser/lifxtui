// Effects engine for LIFX lights
import type { ClientInstance, Device } from 'lifxlan/index.js';
import { SetWaveformCommand, SetColorCommand, Waveform } from 'lifxlan/index.js';
import { createSignal } from 'solid-js';
import type { HSBK } from '../utils/colors';
import { COLOR_PRESETS } from '../utils/colors';

const DEFAULT_BLUE: HSBK = { hue: 43690, saturation: 65535, brightness: 65535, kelvin: 3500 };
const DEFAULT_PURPLE: HSBK = { hue: 49151, saturation: 65535, brightness: 65535, kelvin: 3500 };
const DEFAULT_PINK: HSBK = { hue: 58981, saturation: 45000, brightness: 65535, kelvin: 3500 };

export type EffectType = 'pulse' | 'breathe' | 'strobe' | 'rainbow' | 'candle';

export interface EffectConfig {
  type: EffectType;
  speed: number; // Period in ms
  intensity: number; // 0-1
  colors?: HSBK[];
}

export interface DJConfig {
  bpm: number;
  pattern: DJPattern;
  colors: HSBK[];
  intensity: number;
  subdivision: number; // 1 = full beat, 2 = half beat, 4 = quarter beat
}

function safeColor(color: HSBK | undefined, fallback: HSBK): HSBK {
  return color ?? fallback;
}

export type DJPattern = 'chase' | 'strobe' | 'alternate' | 'wave' | 'random' | 'pulse' | 'blackout';

// Built-in waveform effects using LIFX protocol
export function createWaveformEffect(
  client: ClientInstance,
  devices: Device[],
  config: EffectConfig
) {
  const { type, speed, intensity } = config;
  const baseColor = safeColor(config.colors?.[0], DEFAULT_BLUE);

  let waveform: typeof Waveform[keyof typeof Waveform];
  let transient = true;
  let skewRatio = 0.5;

  switch (type) {
    case 'pulse':
      waveform = Waveform.PULSE;
      skewRatio = 0.3;
      break;
    case 'breathe':
      waveform = Waveform.SINE;
      skewRatio = 0.5;
      break;
    case 'strobe':
      waveform = Waveform.PULSE;
      skewRatio = 0.1;
      break;
    default:
      waveform = Waveform.SINE;
  }

  // Apply to all devices
  devices.forEach((device) => {
    client.unicast(
      SetWaveformCommand(
        transient,
        baseColor.hue,
        baseColor.saturation,
        Math.round(baseColor.brightness * intensity),
        baseColor.kelvin,
        speed,
        10, // cycles (let it run)
        skewRatio,
        waveform
      ),
      device
    );
  });
}

// Software-based DJ pattern engine
export function createDJEngine(client: ClientInstance) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let beatCount = 0;
  let lastBeatTime = 0;
  let lastTapTime = 0; // Separate tracker for tap tempo
  let devices: Device[] = [];
  const [config, setConfig] = createSignal<DJConfig>({
    bpm: 120,
    pattern: 'chase',
    colors: [DEFAULT_BLUE, DEFAULT_PURPLE, DEFAULT_PINK],
    intensity: 1,
    subdivision: 1,
  });

  function getBeatInterval() {
    return (60000 / config().bpm) / config().subdivision;
  }

  function onBeat() {
    if (devices.length === 0) return;

    const cfg = config();
    beatCount++;
    const colorIndex = beatCount % cfg.colors.length;
    const color = safeColor(cfg.colors[colorIndex], DEFAULT_BLUE);

    switch (cfg.pattern) {
      case 'chase':
        // Light up one device at a time
        const deviceIndex = beatCount % devices.length;
        devices.forEach((device, i) => {
          if (i === deviceIndex) {
            client.unicast(
              SetColorCommand(color.hue, color.saturation, Math.round(color.brightness * cfg.intensity), color.kelvin, 50),
              device
            );
          } else {
            client.unicast(
              SetColorCommand(0, 0, Math.round(color.brightness * 0.1 * cfg.intensity), color.kelvin, 100),
              device
            );
          }
        });
        break;

      case 'strobe':
        // Flash all on/off
        const isOn = beatCount % 2 === 0;
        devices.forEach((device) => {
          client.unicast(
            SetColorCommand(
              color.hue,
              color.saturation,
              isOn ? Math.round(color.brightness * cfg.intensity) : 0,
              color.kelvin,
              0
            ),
            device
          );
        });
        break;

      case 'alternate':
        // Even/odd lights alternate
        devices.forEach((device, i) => {
          const shouldLight = (i % 2) === (beatCount % 2);
          client.unicast(
            SetColorCommand(
              color.hue,
              color.saturation,
              shouldLight ? Math.round(color.brightness * cfg.intensity) : Math.round(color.brightness * 0.2),
              color.kelvin,
              50
            ),
            device
          );
        });
        break;

      case 'wave':
        // Color wave across devices
        devices.forEach((device, i) => {
          const phase = (beatCount + i) % cfg.colors.length;
          const waveColor = safeColor(cfg.colors[phase], DEFAULT_BLUE);
          client.unicast(
            SetColorCommand(
              waveColor.hue,
              waveColor.saturation,
              Math.round(waveColor.brightness * cfg.intensity),
              waveColor.kelvin,
              getBeatInterval() * 0.8
            ),
            device
          );
        });
        break;

      case 'random':
        // Random color per device per beat
        devices.forEach((device) => {
          const randColor = safeColor(cfg.colors[Math.floor(Math.random() * cfg.colors.length)], DEFAULT_BLUE);
          client.unicast(
            SetColorCommand(
              randColor.hue,
              randColor.saturation,
              Math.round(randColor.brightness * cfg.intensity),
              randColor.kelvin,
              50
            ),
            device
          );
        });
        break;

      case 'pulse':
        // All lights pulse together
        devices.forEach((device) => {
          client.unicast(
            SetWaveformCommand(
              true,
              color.hue,
              color.saturation,
              Math.round(color.brightness * cfg.intensity),
              color.kelvin,
              getBeatInterval(),
              1,
              0.5,
              Waveform.SINE
            ),
            device
          );
        });
        break;

      case 'blackout':
        // Brief flash then blackout
        devices.forEach((device) => {
          client.unicast(
            SetColorCommand(color.hue, color.saturation, Math.round(65535 * cfg.intensity), color.kelvin, 0),
            device
          );
          setTimeout(() => {
            client.unicast(SetColorCommand(0, 0, 0, color.kelvin, 50), device);
          }, 50);
        });
        break;
    }
  }

  function start(newDevices: Device[], newConfig?: Partial<DJConfig>) {
    stop();
    devices = newDevices;
    if (newConfig) {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    }
    beatCount = 0;
    lastBeatTime = Date.now();
    intervalId = setInterval(onBeat, getBeatInterval());
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function updateConfig(newConfig: Partial<DJConfig>) {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    if (intervalId) {
      // Restart with new timing
      stop();
      intervalId = setInterval(onBeat, getBeatInterval());
    }
  }

  function tapTempo() {
    const now = Date.now();
    if (lastTapTime > 0) {
      const interval = now - lastTapTime;
      if (interval > 200 && interval < 2000) {
        const newBpm = Math.round(60000 / interval);
        updateConfig({ bpm: newBpm });
      }
    }
    lastTapTime = now;
  }

  function isRunning() {
    return intervalId !== null;
  }

  // Return the signal directly for reactive access
  function getConfig() {
    return config();
  }

  return {
    start,
    stop,
    updateConfig,
    tapTempo,
    isRunning,
    getConfig,
    config, // Expose the signal for reactive subscriptions
  };
}

export type DJEngine = ReturnType<typeof createDJEngine>;

// Candle flicker effect (software-based)
export function createCandleEffect(client: ClientInstance) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let devices: Device[] = [];

  function start(newDevices: Device[]) {
    stop();
    devices = newDevices;

    intervalId = setInterval(() => {
      devices.forEach((device) => {
        // Random warm color with flickering brightness
        const hue = 5000 + Math.random() * 3000; // Orange-ish
        const brightness = 20000 + Math.random() * 25000;
        const duration = 100 + Math.random() * 200;

        client.unicast(
          SetColorCommand(hue, 65535, brightness, 2000, duration),
          device
        );
      });
    }, 150);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop };
}

// Rainbow cycle effect
export function createRainbowEffect(client: ClientInstance) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let devices: Device[] = [];
  let hueOffset = 0;

  function start(newDevices: Device[], speed: number = 50) {
    stop();
    devices = newDevices;
    hueOffset = 0;

    intervalId = setInterval(() => {
      hueOffset = (hueOffset + 500) % 65535;

      devices.forEach((device, i) => {
        const deviceHue = (hueOffset + (i * 65535 / devices.length)) % 65535;
        client.unicast(
          SetColorCommand(deviceHue, 65535, 65535, 3500, speed),
          device
        );
      });
    }, speed);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop };
}
