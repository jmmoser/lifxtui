// Main App component
import { createSignal, createEffect, createMemo, Show, onCleanup } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { TextAttributes } from '@opentui/core';
import { DeviceList, getFlatList } from './DeviceList';
import { ColorControl, COLOR_PRESET_LIST } from './ColorControl';
import { EffectsPanel } from './EffectsPanel';
import { ScenesPanel, DEFAULT_SCENES, type Scene } from './ScenesPanel';
import { StatusBar } from './StatusBar';
import { HelpOverlay } from './HelpOverlay';
import { DJMode, COLOR_PALETTES } from './DJMode';
import type { LifxStoreType } from '../lifx/store';
import type { DJEngine } from '../lifx/effects';
import { createRainbowEffect, createCandleEffect, createWaveformEffect } from '../lifx/effects';
import { COLOR_PRESETS } from '../utils/colors';
import type { ClientInstance } from 'lifxlan/index.js';

type Panel = 'devices' | 'control' | 'effects' | 'scenes';

interface AppProps {
  store: LifxStoreType;
  djEngine: DJEngine;
  client: ClientInstance;
}

export function App(props: AppProps) {
  // UI State
  const [activePanel, setActivePanel] = createSignal<Panel>('devices');
  const [showHelp, setShowHelp] = createSignal(false);
  const [showDJMode, setShowDJMode] = createSignal(false);

  // Panel-specific focus indices
  const [deviceFocusIndex, setDeviceFocusIndex] = createSignal(0);
  const [controlFocusIndex, setControlFocusIndex] = createSignal(1); // Start on Hue slider
  const [effectsFocusIndex, setEffectsFocusIndex] = createSignal(0);
  const [scenesFocusIndex, setScenesFocusIndex] = createSignal(0);

  // Scenes
  const [scenes, setScenes] = createSignal<Scene[]>(
    DEFAULT_SCENES.map((s) => ({ ...s, devices: {} }))
  );

  // Effects
  const rainbowEffect = createRainbowEffect(props.client);
  const candleEffect = createCandleEffect(props.client);
  const [activeEffect, setActiveEffect] = createSignal<string | null>(null);

  // Cleanup on unmount
  onCleanup(() => {
    rainbowEffect.stop();
    candleEffect.stop();
    props.djEngine.stop();
  });

  // Get flat list for device navigation
  const flatList = createMemo(() => getFlatList(props.store));

  // Panel navigation order
  const panels: Panel[] = ['devices', 'control', 'scenes'];

  const cyclePanel = (direction: 1 | -1) => {
    const currentIndex = panels.indexOf(activePanel());
    const newIndex = (currentIndex + direction + panels.length) % panels.length;
    const newPanel = panels[newIndex];
    if (newPanel) {
      setActivePanel(newPanel);
    }
  };

  // Stop all effects
  const stopAllEffects = () => {
    rainbowEffect.stop();
    candleEffect.stop();
    props.djEngine.stop();
    setActiveEffect(null);
  };

  // Start an effect
  const startEffect = (effect: string) => {
    stopAllEffects();

    const selectedDevices = props.store.store.selectedDevices
      .map((sn) => props.store.store.devices[sn]?.device)
      .filter(Boolean);

    if (selectedDevices.length === 0) return;

    switch (effect) {
      case 'rainbow':
        rainbowEffect.start(selectedDevices as any, 100);
        setActiveEffect('rainbow');
        break;
      case 'candle':
        candleEffect.start(selectedDevices as any);
        setActiveEffect('candle');
        break;
      case 'pulse':
      case 'breathe':
      case 'strobe':
        createWaveformEffect(props.client, selectedDevices as any, {
          type: effect as any,
          speed: effect === 'strobe' ? 100 : 1000,
          intensity: 1,
          colors: [COLOR_PRESETS.blue!],
        });
        setActiveEffect(effect);
        break;
    }
  };

  // Keyboard handler
  useKeyboard((key) => {
    const k = key.name;

    // Handle help overlay
    if (showHelp()) {
      setShowHelp(false);
      return;
    }

    // Handle DJ mode
    if (showDJMode()) {
      handleDJModeKeys(key);
      return;
    }

    // Navigation keys for devices panel
    if (activePanel() === 'devices') {
      if (k === 'up' || k === 'k') {
        setDeviceFocusIndex(Math.max(0, deviceFocusIndex() - 1));
        return;
      }
      if (k === 'down' || k === 'j') {
        const list = flatList();
        setDeviceFocusIndex(Math.min(list.length - 1, deviceFocusIndex() + 1));
        return;
      }
      if (k === 'space') {
        const list = flatList();
        const item = list[deviceFocusIndex()];
        if (item) {
          if (item.type === 'group') {
            props.store.selectGroup(item.id);
          } else {
            props.store.toggleSelect(item.id);
          }
        }
        return;
      }
      if (k === 'return') {
        const list = flatList();
        const item = list[deviceFocusIndex()];
        if (item) {
          if (item.type === 'group') {
            props.store.toggleGroup(item.id);
          } else {
            props.store.selectDevice(item.id);
          }
        }
        return;
      }
    }

    // Navigation keys for control panel
    if (activePanel() === 'control') {
      if (k === 'up' || k === 'k') {
        setControlFocusIndex(Math.max(0, controlFocusIndex() - 1));
        return;
      }
      if (k === 'down' || k === 'j') {
        setControlFocusIndex(Math.min(4, controlFocusIndex() + 1));
        return;
      }
      if (k === 'left' || k === 'h') {
        const step = key.shift ? 1000 : 5000;
        const kelvinStep = key.shift ? 100 : 500;
        adjustSlider(controlFocusIndex(), -step, -kelvinStep);
        return;
      }
      if (k === 'right' || k === 'l') {
        const step = key.shift ? 1000 : 5000;
        const kelvinStep = key.shift ? 100 : 500;
        adjustSlider(controlFocusIndex(), step, kelvinStep);
        return;
      }
    }

    // Navigation keys for scenes panel
    if (activePanel() === 'scenes') {
      if (k === 'up' || k === 'k') {
        setScenesFocusIndex(Math.max(0, scenesFocusIndex() - 1));
        return;
      }
      if (k === 'down' || k === 'j') {
        const sceneList = scenes();
        setScenesFocusIndex(Math.min(sceneList.length - 1, scenesFocusIndex() + 1));
        return;
      }
    }

    // Global keys
    switch (k) {
      case 'escape':
        props.store.selectNone();
        return;

      case 'q':
        if (!key.ctrl) {
          process.exit(0);
        }
        return;

      case '?':
        setShowHelp(true);
        return;

      case 'd':
        setShowDJMode(true);
        return;

      case 'tab':
        cyclePanel(key.shift ? -1 : 1);
        return;

      case 'p':
        props.store.togglePower();
        return;

      case 'a':
        props.store.selectAll();
        return;

      case 'n':
        props.store.selectNone();
        return;

      case 'e':
        stopAllEffects();
        return;

      case 'r':
        props.store.refreshAll();
        return;

      case 'w':
        // Warm white
        if (COLOR_PRESETS.warmWhite) {
          props.store.setColor({ ...COLOR_PRESETS.warmWhite });
        }
        return;

      case 'c':
        if (!key.ctrl && COLOR_PRESETS.coolWhite) {
          // Cool white
          props.store.setColor({ ...COLOR_PRESETS.coolWhite });
        }
        return;

      // Color presets 1-8
      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8':
        const presetIndex = parseInt(key.name) - 1;
        if (COLOR_PRESET_LIST[presetIndex]) {
          props.store.setColor({ ...COLOR_PRESET_LIST[presetIndex] });
        }
        return;
    }

  });

  const adjustSlider = (slider: number, step: number, kelvinStep: number) => {
    const selected = props.store.store.selectedDevices;
    if (selected.length === 0) return;

    const firstSn = selected[0];
    if (!firstSn) return;
    const firstDevice = props.store.store.devices[firstSn];
    if (!firstDevice) return;

    const color = { ...firstDevice.color };

    switch (slider) {
      case 0: // Power - toggle on left/right
        props.store.togglePower();
        break;
      case 1: // Hue
        color.hue = Math.max(0, Math.min(65535, color.hue + step));
        if (color.hue > 65535) color.hue -= 65535;
        if (color.hue < 0) color.hue += 65535;
        props.store.setColor(color);
        break;
      case 2: // Saturation
        color.saturation = Math.max(0, Math.min(65535, color.saturation + step));
        props.store.setColor(color);
        break;
      case 3: // Brightness
        color.brightness = Math.max(0, Math.min(65535, color.brightness + step));
        props.store.setColor(color);
        break;
      case 4: // Kelvin
        color.kelvin = Math.max(1500, Math.min(9000, color.kelvin + kelvinStep));
        props.store.setColor(color);
        break;
    }
  };

  const handleDJModeKeys = (key: { name: string; shift?: boolean; ctrl?: boolean }) => {
    const config = props.djEngine.getConfig();

    switch (key.name) {
      case 'escape':
        setShowDJMode(false);
        props.djEngine.stop();
        break;

      case 't':
        props.djEngine.tapTempo();
        break;

      case 'space':
        if (props.djEngine.isRunning()) {
          props.djEngine.stop();
        } else {
          const selectedDevices = props.store.store.selectedDevices
            .map((sn) => props.store.store.devices[sn]?.device)
            .filter(Boolean);
          const firstPalette = COLOR_PALETTES[0];
          if (selectedDevices.length > 0 && firstPalette) {
            props.djEngine.start(selectedDevices as any, {
              colors: firstPalette.colors,
            });
          }
        }
        break;

      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7':
        const patterns = ['chase', 'strobe', 'alternate', 'wave', 'random', 'pulse', 'blackout'] as const;
        const patternIndex = parseInt(key.name) - 1;
        props.djEngine.updateConfig({ pattern: patterns[patternIndex] });
        break;

      case '+':
      case '=':
        props.djEngine.updateConfig({ bpm: Math.min(300, config.bpm + 5) });
        break;

      case '-':
        props.djEngine.updateConfig({ bpm: Math.max(30, config.bpm - 5) });
        break;

      case 'i':
        const newIntensity = key.shift
          ? Math.min(1, config.intensity + 0.1)
          : Math.max(0.1, config.intensity - 0.1);
        props.djEngine.updateConfig({ intensity: newIntensity });
        break;

      case 'p':
        // Cycle palettes (simplified)
        break;
    }
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingLeft={1}
        paddingRight={1}
        height={3}
      >
        <ascii_font font="tiny" text="LIFX" />
        <box flexDirection="column" alignItems="flex-end">
          <text
            content={props.store.store.isScanning ? 'Scanning...' : 'Ready'}
            fg={props.store.store.isScanning ? '#ffaa00' : '#00ff00'}
            attributes={props.store.store.isScanning ? TextAttributes.BLINK : TextAttributes.NONE}
          />
        </box>
      </box>

      {/* Main content */}
      <Show
        when={!showDJMode()}
        fallback={
          <DJMode
            store={props.store}
            djEngine={props.djEngine}
            onExit={() => setShowDJMode(false)}
          />
        }
      >
        <box flexDirection="row" flexGrow={1} gap={1} padding={1}>
          {/* Left: Device list */}
          <DeviceList
            store={props.store}
            focusedIndex={deviceFocusIndex()}
            onFocusChange={setDeviceFocusIndex}
            onActivate={() => setActivePanel('devices')}
          />

          {/* Middle: Color control */}
          <box flexDirection="column" flexGrow={1} gap={1}>
            <ColorControl
              store={props.store}
              focused={activePanel() === 'control'}
              focusedSlider={controlFocusIndex()}
              onSliderChange={setControlFocusIndex}
              onActivate={() => setActivePanel('control')}
            />

            {/* Effects panel */}
            <EffectsPanel
              store={props.store}
              djEngine={props.djEngine}
              focused={activePanel() === 'effects'}
              focusedItem={effectsFocusIndex()}
              onItemChange={setEffectsFocusIndex}
              onActivate={() => setActivePanel('effects')}
            />
          </box>

          {/* Right: Scenes */}
          <ScenesPanel
            store={props.store}
            scenes={scenes()}
            onApplyScene={() => {}}
            onSaveScene={() => {}}
            focused={activePanel() === 'scenes'}
            focusedIndex={scenesFocusIndex()}
            onFocusChange={setScenesFocusIndex}
            onActivate={() => setActivePanel('scenes')}
          />
        </box>
      </Show>

      {/* Status bar */}
      <StatusBar
        store={props.store}
        djEngine={props.djEngine}
        activePanel={activePanel()}
      />

      {/* Help overlay */}
      <Show when={showHelp()}>
        <HelpOverlay onClose={() => setShowHelp(false)} />
      </Show>
    </box>
  );
}
