// Full-screen DJ Mode interface
import { createSignal, createMemo, createEffect, For, Show, onCleanup } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType } from '../lifx/store';
import type { DJEngine, DJPattern } from '../lifx/effects';
import { hsbkToHex, COLOR_PRESETS } from '../utils/colors';
import type { HSBK } from '../utils/colors';

interface DJModeProps {
  store: LifxStoreType;
  djEngine: DJEngine;
  onExit: () => void;
}

const DJ_PATTERNS: { name: string; pattern: DJPattern; key: string; desc: string }[] = [
  { name: 'Chase', pattern: 'chase', key: '1', desc: 'Lights fire sequentially' },
  { name: 'Strobe', pattern: 'strobe', key: '2', desc: 'Flash all on/off' },
  { name: 'Alternate', pattern: 'alternate', key: '3', desc: 'Even/odd alternate' },
  { name: 'Wave', pattern: 'wave', key: '4', desc: 'Color wave flows' },
  { name: 'Random', pattern: 'random', key: '5', desc: 'Random colors' },
  { name: 'Pulse', pattern: 'pulse', key: '6', desc: 'All pulse together' },
  { name: 'Blackout', pattern: 'blackout', key: '7', desc: 'Flash then dark' },
];

const COLOR_PALETTES: { name: string; colors: HSBK[] }[] = [
  { name: 'Party', colors: [COLOR_PRESETS.blue!, COLOR_PRESETS.purple!, COLOR_PRESETS.pink!, COLOR_PRESETS.cyan!] },
  { name: 'Fire', colors: [COLOR_PRESETS.red!, COLOR_PRESETS.orange!, COLOR_PRESETS.yellow!] },
  { name: 'Ocean', colors: [COLOR_PRESETS.blue!, COLOR_PRESETS.cyan!, COLOR_PRESETS.green!] },
  { name: 'Sunset', colors: [COLOR_PRESETS.red!, COLOR_PRESETS.orange!, COLOR_PRESETS.pink!, COLOR_PRESETS.purple!] },
  { name: 'RGB', colors: [COLOR_PRESETS.red!, COLOR_PRESETS.green!, COLOR_PRESETS.blue!] },
  { name: 'Mono', colors: [COLOR_PRESETS.white!, { ...COLOR_PRESETS.white!, brightness: 10000 }] },
];

const SUBDIVISIONS = [
  { label: '1/4', value: 4 },
  { label: '1/2', value: 2 },
  { label: '1x', value: 1 },
  { label: '2x', value: 0.5 },
  { label: '4x', value: 0.25 },
];

export function DJMode(props: DJModeProps) {
  const [beatVisual, setBeatVisual] = createSignal(false);
  const [tapTimes, setTapTimes] = createSignal<number[]>([]);
  const [selectedPalette, setSelectedPalette] = createSignal(0);
  const [selectedSubdiv, setSelectedSubdiv] = createSignal(2); // 1x

  // Use the reactive signal directly from djEngine
  const config = () => props.djEngine.config();

  // Beat visualizer
  createEffect(() => {
    if (props.djEngine.isRunning()) {
      const interval = 60000 / config().bpm;
      const beatInterval = setInterval(() => {
        setBeatVisual(true);
        setTimeout(() => setBeatVisual(false), 50);
      }, interval);

      onCleanup(() => clearInterval(beatInterval));
    }
  });

  // ASCII beat visualizer
  const beatBar = createMemo(() => {
    const bars = 16;
    const active = beatVisual() ? '█' : '▓';
    return Array(bars).fill(active).join('');
  });

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <ascii_font font="tiny" text="DJ MODE" />
        <box flexDirection="column" alignItems="flex-end">
          <text
            content={props.djEngine.isRunning() ? '● LIVE' : '○ STOPPED'}
            fg={props.djEngine.isRunning() ? '#00ff00' : '#ff4444'}
            attributes={TextAttributes.BOLD}
          />
          <text content="[Esc] exit" attributes={TextAttributes.DIM} />
        </box>
      </box>

      {/* Main content */}
      <box flexDirection="row" gap={2} flexGrow={1}>
        {/* Left: BPM & Controls */}
        <box flexDirection="column" width={30} borderStyle="rounded" border={true} padding={1}>
          <text content="TEMPO" attributes={TextAttributes.BOLD} />

          {/* BPM Display */}
          <box flexDirection="row" alignItems="baseline" marginTop={1}>
            <text
              content={config().bpm.toString()}
              fg="#ffff00"
              attributes={TextAttributes.BOLD}
            />
            <text content=" BPM" attributes={TextAttributes.DIM} />
          </box>

          {/* Tap tempo hint */}
          <text content="[t] tap  [+/-] adjust" attributes={TextAttributes.DIM} />

          {/* Beat visualizer */}
          <box marginTop={1}>
            <text content="Beat" attributes={TextAttributes.DIM} />
            <text
              content={beatBar()}
              fg={beatVisual() ? '#ff00ff' : '#444444'}
            />
          </box>

          {/* Subdivision */}
          <box marginTop={1}>
            <text content="Subdivision" attributes={TextAttributes.DIM} />
            <box flexDirection="row" gap={1}>
              <For each={SUBDIVISIONS}>
                {(sub, index) => (
                  <text
                    content={`[${sub.label}]`}
                    fg={index() === selectedSubdiv() ? '#00ffff' : '#666666'}
                    attributes={index() === selectedSubdiv() ? TextAttributes.BOLD : TextAttributes.NONE}
                  />
                )}
              </For>
            </box>
          </box>

          {/* Intensity */}
          <box marginTop={1}>
            <text content="Intensity" attributes={TextAttributes.DIM} />
            <box flexDirection="row">
              <text
                content={'█'.repeat(Math.round(config().intensity * 10))}
                fg="#ff00ff"
              />
              <text
                content={'░'.repeat(10 - Math.round(config().intensity * 10))}
                fg="#333333"
              />
              <text content={` ${Math.round(config().intensity * 100)}%`} attributes={TextAttributes.DIM} />
            </box>
            <text content="[i/I] adjust" attributes={TextAttributes.DIM} />
          </box>
        </box>

        {/* Middle: Patterns */}
        <box flexDirection="column" flexGrow={1} borderStyle="rounded" border={true} padding={1}>
          <text content="PATTERNS" attributes={TextAttributes.BOLD} />

          <box flexDirection="column" marginTop={1} gap={0}>
            <For each={DJ_PATTERNS}>
              {(item) => (
                <box flexDirection="row" gap={2} height={1}>
                  <text
                    content={`[${item.key}]`}
                    fg="#888888"
                  />
                  <text
                    content={item.name.padEnd(10)}
                    fg={config().pattern === item.pattern ? '#ff00ff' : '#ffffff'}
                    attributes={config().pattern === item.pattern ? TextAttributes.BOLD | TextAttributes.INVERSE : TextAttributes.NONE}
                  />
                  <text
                    content={item.desc}
                    attributes={TextAttributes.DIM}
                  />
                </box>
              )}
            </For>
          </box>

          {/* Start/Stop */}
          <box marginTop={1} flexDirection="row" gap={2}>
            <text
              content="[Space] START/STOP"
              fg={props.djEngine.isRunning() ? '#ff4444' : '#00ff00'}
              attributes={TextAttributes.BOLD}
            />
          </box>
        </box>

        {/* Right: Palettes */}
        <box flexDirection="column" width={25} borderStyle="rounded" border={true} padding={1}>
          <text content="PALETTES" attributes={TextAttributes.BOLD} />

          <box flexDirection="column" marginTop={1}>
            <For each={COLOR_PALETTES}>
              {(palette, index) => (
                <box flexDirection="row" gap={1} height={1}>
                  <text
                    content={index() === selectedPalette() ? '▶' : ' '}
                    fg="#ff00ff"
                  />
                  <text
                    content={palette.name.padEnd(8)}
                    fg={index() === selectedPalette() ? '#ffffff' : '#888888'}
                    attributes={index() === selectedPalette() ? TextAttributes.BOLD : TextAttributes.NONE}
                  />
                  <For each={palette.colors}>
                    {(color) => (
                      <text content="█" fg={hsbkToHex(color)} />
                    )}
                  </For>
                </box>
              )}
            </For>
          </box>

          <text content="[p/P] select palette" attributes={TextAttributes.DIM} marginTop={1} />
        </box>
      </box>

      {/* Footer: Selected devices */}
      <box marginTop={1} flexDirection="row" gap={2}>
        <text content={`${props.store.store.selectedDevices.length} devices selected`} attributes={TextAttributes.DIM} />
        <text content="│" attributes={TextAttributes.DIM} />
        <text
          content={props.djEngine.isRunning() ? `Playing: ${config().pattern}` : 'Ready'}
          fg={props.djEngine.isRunning() ? '#00ff00' : '#888888'}
        />
      </box>
    </box>
  );
}

export { COLOR_PALETTES, DJ_PATTERNS, SUBDIVISIONS };
