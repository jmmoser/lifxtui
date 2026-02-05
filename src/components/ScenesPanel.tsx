// Scenes management panel
import { createSignal, createMemo, For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType } from '../lifx/store';
import { hsbkToHex } from '../utils/colors';
import type { HSBK } from '../utils/colors';

export interface Scene {
  id: string;
  name: string;
  icon: string;
  devices: Record<string, { power: boolean; color: HSBK }>;
}

interface ScenesPanelProps {
  store: LifxStoreType;
  scenes: Scene[];
  onApplyScene: (scene: Scene) => void;
  onSaveScene: (name: string) => void;
  focused: boolean;
  focusedIndex: number;
  onFocusChange?: (index: number) => void;
  onActivate?: () => void;
}

// Default scenes
export const DEFAULT_SCENES: Omit<Scene, 'devices'>[] = [
  { id: 'sunset', name: 'Sunset', icon: '🌅' },
  { id: 'party', name: 'Party', icon: '🎉' },
  { id: 'movie', name: 'Movie', icon: '🎬' },
  { id: 'focus', name: 'Focus', icon: '💼' },
  { id: 'night', name: 'Night', icon: '🌙' },
  { id: 'bright', name: 'Bright', icon: '☀️' },
];

export function ScenesPanel(props: ScenesPanelProps) {
  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      border={true}
      title=" Scenes "
      titleAlignment="left"
      padding={1}
      width={22}
      flexShrink={0}
      onMouseDown={() => props.onActivate?.()}
    >
      <For each={props.scenes}>
        {(scene, index) => (
          <box
            flexDirection="row"
            height={1}
            onMouseDown={(e: any) => {
              if (e.button === 0) {
                props.onFocusChange?.(index());
                props.onApplyScene(scene);
              }
            }}
          >
            <text
              content={`${scene.icon} ${scene.name}`}
              attributes={
                props.focused && props.focusedIndex === index()
                  ? TextAttributes.INVERSE
                  : TextAttributes.NONE
              }
              fg={props.focused && props.focusedIndex === index() ? '#000000' : '#ffffff'}
              bg={props.focused && props.focusedIndex === index() ? '#ffaa00' : undefined}
            />
          </box>
        )}
      </For>

      {/* Add scene option */}
      <box marginTop={1}>
        <text
          content="+ New Scene..."
          attributes={TextAttributes.DIM}
        />
      </box>

      <box flexGrow={1} />

      {/* Hints */}
      <text content="[s] save current" attributes={TextAttributes.DIM} />
      <text content="[Enter] apply" attributes={TextAttributes.DIM} />
    </box>
  );
}

// Scene utilities
export function createSceneFromCurrentState(store: LifxStoreType, name: string, icon: string = '💡'): Scene {
  const devices: Scene['devices'] = {};

  for (const sn of store.store.selectedDevices) {
    const device = store.store.devices[sn];
    if (device) {
      devices[sn] = {
        power: device.power,
        color: { ...device.color },
      };
    }
  }

  return {
    id: `scene-${Date.now()}`,
    name,
    icon,
    devices,
  };
}

export async function applyScene(store: LifxStoreType, scene: Scene) {
  // Select all devices in the scene
  store.selectNone();

  for (const sn of Object.keys(scene.devices)) {
    if (store.store.devices[sn]) {
      store.toggleSelect(sn);
    }
  }

  // Apply states
  for (const [sn, state] of Object.entries(scene.devices)) {
    if (store.store.devices[sn]) {
      // This is a simplified version - in reality we'd batch these
      const devices = [sn];
      // Need to implement per-device setColor/setPower in store
    }
  }
}
