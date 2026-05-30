// Effects panel for animations and DJ mode
import { createMemo, For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType } from '../lifx/store';
import type { DJEngine, DJPattern, EffectType } from '../lifx/effects';
import { hsbkToHex } from '../utils/colors';

interface EffectsPanelProps {
  store: LifxStoreType;
  djEngine: DJEngine;
  focused: boolean;
  focusedItem: number;
  onItemChange: (item: number) => void;
  onActivate?: () => void;
  activeEffect?: string | null;
  onStartEffect?: (effect: EffectType) => void;
  onStopEffects?: () => void;
}

// Items: 0-4 = effects, 5 = Stop
export const EFFECT_TYPES: { name: string; type: EffectType }[] = [
  { name: 'Pulse', type: 'pulse' },
  { name: 'Breathe', type: 'breathe' },
  { name: 'Strobe', type: 'strobe' },
  { name: 'Rainbow', type: 'rainbow' },
  { name: 'Candle', type: 'candle' },
];

const DJ_PATTERNS: { name: string; pattern: DJPattern }[] = [
  { name: 'Chase', pattern: 'chase' },
  { name: 'Strobe', pattern: 'strobe' },
  { name: 'Alternate', pattern: 'alternate' },
  { name: 'Wave', pattern: 'wave' },
  { name: 'Random', pattern: 'random' },
  { name: 'Pulse', pattern: 'pulse' },
  { name: 'Blackout', pattern: 'blackout' },
];

export function EffectsPanel(props: EffectsPanelProps) {
  const djConfig = () => props.djEngine.config();
  const djActive = () => props.djEngine.isRunning();

  const selectedCount = createMemo(() => props.store.store.selectedDevices.length);

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      border={true}
      title=" Effects "
      titleAlignment="left"
      padding={1}
      height={12}
      onMouseDown={() => props.onActivate?.()}
    >
      <Show
        when={selectedCount() > 0}
        fallback={
          <text content="Select devices first" attributes={TextAttributes.DIM} />
        }
      >
        {/* Quick effects */}
        <box flexDirection="row" gap={1}>
          <For each={EFFECT_TYPES}>
            {(effect, index) => (
              <text
                content={`[${effect.name}]`}
                fg={props.activeEffect === effect.type ? '#00ff00' : '#888888'}
                attributes={
                  props.focused && props.focusedItem === index()
                    ? TextAttributes.INVERSE
                    : props.activeEffect === effect.type
                    ? TextAttributes.BOLD
                    : TextAttributes.NONE
                }
                onMouseDown={(e: any) => {
                  if (e.button === 0) {
                    props.onActivate?.();
                    props.onItemChange(index());
                    props.onStartEffect?.(effect.type);
                  }
                }}
              />
            )}
          </For>
          <text
            content="[Stop]"
            fg="#ff4444"
            attributes={props.focused && props.focusedItem === 5 ? TextAttributes.INVERSE : TextAttributes.NONE}
            onMouseDown={(e: any) => {
              if (e.button === 0) {
                props.onActivate?.();
                props.onItemChange(5);
                props.onStopEffects?.();
              }
            }}
          />
        </box>

        {/* DJ Mode section */}
        <box marginTop={1} flexDirection="column">
          <box flexDirection="row" gap={2}>
            <text
              content={djActive() ? '♫ DJ MODE ON' : '♫ DJ Mode'}
              fg={djActive() ? '#ff00ff' : '#888888'}
              attributes={djActive() ? TextAttributes.BOLD | TextAttributes.BLINK : TextAttributes.NONE}
            />
            <text
              content={`BPM: ${djConfig().bpm}`}
              fg="#ffff00"
              attributes={TextAttributes.BOLD}
            />
            <text
              content="[t] tap tempo"
              attributes={TextAttributes.DIM}
            />
          </box>

          {/* DJ Patterns */}
          <box flexDirection="row" gap={1} marginTop={0}>
            <For each={DJ_PATTERNS}>
              {(item, index) => (
                <text
                  content={item.name}
                  fg={djConfig().pattern === item.pattern ? '#ff00ff' : '#666666'}
                  attributes={
                    djConfig().pattern === item.pattern
                      ? TextAttributes.BOLD
                      : TextAttributes.DIM
                  }
                />
              )}
            </For>
          </box>

          {/* DJ Color palette */}
          <box flexDirection="row" gap={0} marginTop={0}>
            <text content="Palette: " attributes={TextAttributes.DIM} />
            <For each={djConfig().colors}>
              {(color) => (
                <text content="██" fg={hsbkToHex(color)} />
              )}
            </For>
          </box>
        </box>

        {/* Hints */}
        <box flexGrow={1} />
        <text content="[d] DJ mode  [e] stop effects" attributes={TextAttributes.DIM} />
      </Show>
    </box>
  );
}
