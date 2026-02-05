// Color control panel with HSBK sliders
import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { Slider, ColorSwatch, Toggle } from './Slider';
import type { LifxStoreType } from '../lifx/store';
import type { HSBK } from '../utils/colors';
import {
  hsbkToHex,
  generateHueGradient,
  generateKelvinGradient,
  COLOR_PRESETS,
  KELVIN_PRESETS,
} from '../utils/colors';

interface ColorControlProps {
  store: LifxStoreType;
  focused: boolean;
  focusedSlider: number;
  onSliderChange: (slider: number) => void;
  onActivate?: () => void;
}

// Control items: 0=Power, 1=Hue, 2=Saturation, 3=Brightness, 4=Kelvin, 5+=Presets
const SLIDER_COUNT = 5;

export function ColorControl(props: ColorControlProps) {
  // Current color from first selected device, or default
  const defaultColor: HSBK = { hue: 0, saturation: 0, brightness: 32768, kelvin: 3500 };
  const currentColor = createMemo((): HSBK => {
    const selected = props.store.store.selectedDevices;
    if (selected.length === 0) {
      return defaultColor;
    }
    const firstSn = selected[0];
    if (!firstSn) return defaultColor;
    const firstDevice = props.store.store.devices[firstSn];
    return firstDevice?.color ?? defaultColor;
  });

  const currentPower = createMemo((): boolean => {
    const selected = props.store.store.selectedDevices;
    if (selected.length === 0) return false;
    // Return true if any selected device is on
    return selected.some((sn) => props.store.store.devices[sn]?.power);
  });

  // Pre-generate gradients
  const hueGradient = generateHueGradient(30);
  const kelvinGradient = generateKelvinGradient(30);

  const saturationGradient = createMemo(() => {
    const color = currentColor();
    const steps = 30;
    const gradient: string[] = [];
    for (let i = 0; i < steps; i++) {
      const sat = Math.round((i / (steps - 1)) * 65535);
      gradient.push(hsbkToHex({ ...color, saturation: sat, brightness: 65535 }));
    }
    return gradient;
  });

  const brightnessGradient = createMemo(() => {
    const color = currentColor();
    const steps = 30;
    const gradient: string[] = [];
    for (let i = 0; i < steps; i++) {
      const bri = Math.round((i / (steps - 1)) * 65535);
      gradient.push(hsbkToHex({ ...color, brightness: bri }));
    }
    return gradient;
  });

  // Handle value changes
  const handleHueChange = (value: number) => {
    const color = { ...currentColor(), hue: value };
    props.store.setColor(color);
  };

  const handleSaturationChange = (value: number) => {
    const color = { ...currentColor(), saturation: value };
    props.store.setColor(color);
  };

  const handleBrightnessChange = (value: number) => {
    const color = { ...currentColor(), brightness: value };
    props.store.setColor(color);
  };

  const handleKelvinChange = (value: number) => {
    const color = { ...currentColor(), kelvin: value };
    props.store.setColor(color);
  };

  const handlePowerChange = (value: boolean) => {
    props.store.setPower(value);
  };

  // Color presets
  const presets = [
    { name: 'Red', color: COLOR_PRESETS.red! },
    { name: 'Orange', color: COLOR_PRESETS.orange! },
    { name: 'Yellow', color: COLOR_PRESETS.yellow! },
    { name: 'Green', color: COLOR_PRESETS.green! },
    { name: 'Cyan', color: COLOR_PRESETS.cyan! },
    { name: 'Blue', color: COLOR_PRESETS.blue! },
    { name: 'Purple', color: COLOR_PRESETS.purple! },
    { name: 'Pink', color: COLOR_PRESETS.pink! },
  ];

  const selectedCount = createMemo(() => props.store.store.selectedDevices.length);

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      border={true}
      title=" Color Control "
      titleAlignment="left"
      padding={1}
      flexGrow={1}
      onMouseDown={() => props.onActivate?.()}
    >
      <Show
        when={selectedCount() > 0}
        fallback={
          <box flexGrow={1} alignItems="center" justifyContent="center">
            <text content="Select a device to control" attributes={TextAttributes.DIM} />
          </box>
        }
      >
        {/* Color preview */}
        <box flexDirection="row" gap={2} marginBottom={1}>
          <box flexDirection="column">
            <text content="Preview" attributes={TextAttributes.DIM} />
            <text
              content="████████"
              fg={hsbkToHex(currentColor())}
              attributes={TextAttributes.BOLD}
            />
          </box>
          <box flexDirection="column">
            <text content={`${selectedCount()} device${selectedCount() > 1 ? 's' : ''} selected`} attributes={TextAttributes.DIM} />
            <text
              content={currentPower() ? 'POWER ON' : 'POWER OFF'}
              fg={currentPower() ? '#00ff00' : '#ff4444'}
              attributes={TextAttributes.BOLD}
            />
          </box>
        </box>

        {/* Power toggle */}
        <box flexDirection="row" gap={1} height={1} marginBottom={1}>
          <text content="Power" width={12} attributes={props.focusedSlider === 0 ? TextAttributes.BOLD : TextAttributes.NONE} />
          <Toggle
            value={currentPower()}
            onChange={handlePowerChange}
            focused={props.focused && props.focusedSlider === 0}
          />
          <text content="  [p] toggle" attributes={TextAttributes.DIM} />
        </box>

        {/* Hue slider */}
        <Slider
          label="Hue"
          value={currentColor().hue}
          min={0}
          max={65535}
          width={30}
          gradient={hueGradient}
          onChange={handleHueChange}
          focused={props.focused && props.focusedSlider === 1}
          displayValue={`${Math.round(currentColor().hue / 65535 * 360)}°`}
        />

        {/* Saturation slider */}
        <Slider
          label="Saturation"
          value={currentColor().saturation}
          min={0}
          max={65535}
          width={30}
          gradient={saturationGradient()}
          onChange={handleSaturationChange}
          focused={props.focused && props.focusedSlider === 2}
        />

        {/* Brightness slider */}
        <Slider
          label="Brightness"
          value={currentColor().brightness}
          min={0}
          max={65535}
          width={30}
          gradient={brightnessGradient()}
          onChange={handleBrightnessChange}
          focused={props.focused && props.focusedSlider === 3}
        />

        {/* Kelvin slider */}
        <Slider
          label="Temperature"
          value={currentColor().kelvin}
          min={1500}
          max={9000}
          width={30}
          gradient={kelvinGradient}
          onChange={handleKelvinChange}
          focused={props.focused && props.focusedSlider === 4}
          displayValue={`${currentColor().kelvin}K`}
        />

        {/* Color presets */}
        <box marginTop={1}>
          <text content="Presets [1-8]" attributes={TextAttributes.DIM} />
        </box>
        <box flexDirection="row" gap={1} marginTop={0}>
          <For each={presets}>
            {(preset, index) => (
              <box
                flexDirection="column"
                alignItems="center"
                onMouseDown={(e: any) => {
                  if (e.button === 0) {
                    props.store.setColor({ ...preset.color });
                  }
                }}
              >
                <text
                  content="██"
                  fg={hsbkToHex(preset.color)}
                />
                <text
                  content={`${index() + 1}`}
                  attributes={TextAttributes.DIM}
                />
              </box>
            )}
          </For>
        </box>

        {/* Kelvin presets */}
        <box marginTop={1}>
          <text content="White Temps" attributes={TextAttributes.DIM} />
        </box>
        <box flexDirection="row" gap={1}>
          <For each={KELVIN_PRESETS}>
            {(preset) => (
              <text
                content={`${preset.name.slice(0, 4)}`}
                attributes={TextAttributes.DIM}
              />
            )}
          </For>
        </box>

        {/* Hints */}
        <box flexGrow={1} />
        <text content="[←/→] adjust  [↑/↓] slider  [Shift] fine" attributes={TextAttributes.DIM} />
      </Show>
    </box>
  );
}

// Export preset colors for external use
export const COLOR_PRESET_LIST = [
  COLOR_PRESETS.red,
  COLOR_PRESETS.orange,
  COLOR_PRESETS.yellow,
  COLOR_PRESETS.green,
  COLOR_PRESETS.cyan,
  COLOR_PRESETS.blue,
  COLOR_PRESETS.purple,
  COLOR_PRESETS.pink,
];
