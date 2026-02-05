// Color conversion utilities for LIFX HSBK <-> RGB

export interface HSBK {
  hue: number; // 0-65535
  saturation: number; // 0-65535
  brightness: number; // 0-65535
  kelvin: number; // 1500-9000
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// LIFX HSBK to RGB (0-255)
export function hsbkToRgb(hsbk: HSBK): RGB {
  const h = hsbk.hue / 65535;
  const s = hsbk.saturation / 65535;
  const v = hsbk.brightness / 65535;

  if (s === 0) {
    // Grayscale - use kelvin for white balance
    const kelvinRgb = kelvinToRgb(hsbk.kelvin);
    return {
      r: Math.round(kelvinRgb.r * v),
      g: Math.round(kelvinRgb.g * v),
      b: Math.round(kelvinRgb.b * v),
    };
  }

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// RGB (0-255) to LIFX HSBK
export function rgbToHsbk(rgb: RGB, kelvin: number = 3500): HSBK {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    hue: Math.round(h * 65535),
    saturation: Math.round(s * 65535),
    brightness: Math.round(v * 65535),
    kelvin,
  };
}

// Kelvin temperature to RGB approximation
export function kelvinToRgb(kelvin: number): RGB {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

// RGB to hex string
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// HSBK to hex string
export function hsbkToHex(hsbk: HSBK): string {
  return rgbToHex(hsbkToRgb(hsbk));
}

// Hex to RGB
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Common color presets in HSBK
export const COLOR_PRESETS: Record<string, HSBK> = {
  red: { hue: 0, saturation: 65535, brightness: 65535, kelvin: 3500 },
  orange: { hue: 6000, saturation: 65535, brightness: 65535, kelvin: 3500 },
  yellow: { hue: 10920, saturation: 65535, brightness: 65535, kelvin: 3500 },
  green: { hue: 21845, saturation: 65535, brightness: 65535, kelvin: 3500 },
  cyan: { hue: 32767, saturation: 65535, brightness: 65535, kelvin: 3500 },
  blue: { hue: 43690, saturation: 65535, brightness: 65535, kelvin: 3500 },
  purple: { hue: 49151, saturation: 65535, brightness: 65535, kelvin: 3500 },
  pink: { hue: 58981, saturation: 45000, brightness: 65535, kelvin: 3500 },
  white: { hue: 0, saturation: 0, brightness: 65535, kelvin: 5500 },
  warmWhite: { hue: 0, saturation: 0, brightness: 65535, kelvin: 2700 },
  coolWhite: { hue: 0, saturation: 0, brightness: 65535, kelvin: 9000 },
};

// Kelvin presets
export const KELVIN_PRESETS = [
  { name: 'Candle', kelvin: 1500 },
  { name: 'Warm', kelvin: 2700 },
  { name: 'Neutral', kelvin: 3500 },
  { name: 'Daylight', kelvin: 5500 },
  { name: 'Cool', kelvin: 6500 },
  { name: 'Blue Sky', kelvin: 9000 },
];

// Generate a gradient of colors for the hue slider
export function generateHueGradient(steps: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const hue = Math.round((i / steps) * 65535);
    colors.push(hsbkToHex({ hue, saturation: 65535, brightness: 65535, kelvin: 3500 }));
  }
  return colors;
}

// Generate kelvin gradient
export function generateKelvinGradient(steps: number): string[] {
  const colors: string[] = [];
  const minKelvin = 1500;
  const maxKelvin = 9000;
  for (let i = 0; i < steps; i++) {
    const kelvin = minKelvin + Math.round((i / (steps - 1)) * (maxKelvin - minKelvin));
    colors.push(rgbToHex(kelvinToRgb(kelvin)));
  }
  return colors;
}

// Interpolate between two HSBK colors
export function lerpHsbk(a: HSBK, b: HSBK, t: number): HSBK {
  // Handle hue wrapping
  let hueDiff = b.hue - a.hue;
  if (hueDiff > 32767) hueDiff -= 65535;
  if (hueDiff < -32767) hueDiff += 65535;

  let hue = a.hue + hueDiff * t;
  if (hue < 0) hue += 65535;
  if (hue > 65535) hue -= 65535;

  return {
    hue: Math.round(hue),
    saturation: Math.round(a.saturation + (b.saturation - a.saturation) * t),
    brightness: Math.round(a.brightness + (b.brightness - a.brightness) * t),
    kelvin: Math.round(a.kelvin + (b.kelvin - a.kelvin) * t),
  };
}
