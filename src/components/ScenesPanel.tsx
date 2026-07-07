// Scenes management panel
import { For } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType } from '../lifx/store';
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
        {(scene, index) => {
          // Scenes start with no captured devices; applying one is a no-op
          // until the user saves into it, so say so instead of failing
          // silently.
          const isEmpty = () => Object.keys(scene.devices).length === 0;
          const isFocused = () => props.focused && props.focusedIndex === index();
          return (
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
                content={`${scene.icon} ${scene.name}${isEmpty() ? ' (empty)' : ''}`}
                attributes={
                  isFocused()
                    ? TextAttributes.INVERSE
                    : isEmpty()
                    ? TextAttributes.DIM
                    : TextAttributes.NONE
                }
                fg={isFocused() ? '#000000' : '#ffffff'}
                bg={isFocused() ? '#ffaa00' : undefined}
              />
            </box>
          );
        }}
      </For>

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

export function applyScene(store: LifxStoreType, scene: Scene) {
  // Apply the stored power/color state to each device in the scene.
  for (const [sn, state] of Object.entries(scene.devices)) {
    if (!store.store.devices[sn]) continue;
    store.setDevicePower(sn, state.power);
    if (state.power) {
      store.setDeviceColor(sn, state.color);
    }
  }
}
