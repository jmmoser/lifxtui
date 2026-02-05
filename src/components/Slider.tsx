// Reusable slider component for HSBK values
import { createSignal, createEffect, For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  label: string;
  width?: number;
  onChange: (value: number) => void;
  focused?: boolean;
  gradient?: string[]; // Array of hex colors for gradient display
  displayValue?: string; // Custom display value
  showPercentage?: boolean;
}

export function Slider(props: SliderProps) {
  const width = () => props.width ?? 30;
  const percentage = () => (props.value - props.min) / (props.max - props.min);
  const filledWidth = () => Math.round(percentage() * width());

  // Handle click on slider bar to set value
  const handleBarClick = (e: any) => {
    if (e.button !== 0) return;
    // Get click position relative to bar start (after label which is 12 + 1 gap = 13)
    const barX = e.x - 13;
    if (barX >= 0 && barX < width()) {
      const clickPercentage = barX / width();
      const newValue = Math.round(props.min + clickPercentage * (props.max - props.min));
      props.onChange(Math.max(props.min, Math.min(props.max, newValue)));
    }
  };

  // Generate gradient bar or solid bar
  const renderBar = () => {
    const w = width();
    const filled = filledWidth();

    if (props.gradient && props.gradient.length > 0) {
      // Gradient mode - each character gets a color
      const chars: { char: string; color: string }[] = [];
      for (let i = 0; i < w; i++) {
        const colorIndex = Math.floor((i / w) * props.gradient.length);
        const color = props.gradient[Math.min(colorIndex, props.gradient.length - 1)] ?? '#ffffff';
        chars.push({
          char: i < filled ? '█' : '░',
          color: i < filled ? color : '#333333',
        });
      }
      return chars;
    }

    // Solid mode
    return null;
  };

  const gradientChars = () => renderBar();

  const displayVal = () => {
    if (props.displayValue !== undefined) {
      return props.displayValue;
    }
    if (props.showPercentage !== false) {
      return `${Math.round(percentage() * 100)}%`;
    }
    return props.value.toString();
  };

  return (
    <box flexDirection="row" gap={1} height={1} onMouseDown={handleBarClick}>
      <text
        width={12}
        content={props.label}
        attributes={props.focused ? TextAttributes.BOLD : TextAttributes.NONE}
      />
      <Show
        when={gradientChars()}
        fallback={
          <box flexDirection="row" height={1}>
            <text fg="#4488ff" content={'█'.repeat(filledWidth())} />
            <text fg="#333333" content={'░'.repeat(width() - filledWidth())} />
          </box>
        }
      >
        <box flexDirection="row" height={1}>
          <For each={gradientChars()!}>
            {(item) => <text fg={item.color} content={item.char} />}
          </For>
        </box>
      </Show>
      <text
        width={8}
        content={` ${displayVal()}`}
        attributes={TextAttributes.DIM}
      />
    </box>
  );
}

interface ColorSwatchProps {
  color: string; // Hex color
  selected?: boolean;
  label?: string;
  onSelect?: () => void;
}

export function ColorSwatch(props: ColorSwatchProps) {
  return (
    <box
      flexDirection="column"
      alignItems="center"
      padding={0}
      onMouseDown={(e: any) => {
        if (e.button === 0 && props.onSelect) {
          props.onSelect();
        }
      }}
    >
      <text
        content={props.selected ? '▐██▌' : ' ██ '}
        fg={props.color}
        attributes={props.selected ? TextAttributes.BOLD : TextAttributes.NONE}
      />
      <Show when={props.label}>
        <text
          content={props.label!}
          attributes={TextAttributes.DIM}
        />
      </Show>
    </box>
  );
}

interface ToggleProps {
  value: boolean;
  onLabel?: string;
  offLabel?: string;
  onChange: (value: boolean) => void;
  focused?: boolean;
}

export function Toggle(props: ToggleProps) {
  const onLabel = () => props.onLabel ?? 'ON';
  const offLabel = () => props.offLabel ?? 'OFF';

  return (
    <box flexDirection="row" gap={1} height={1}>
      <text
        content={`[${onLabel()}]`}
        fg={props.value ? '#00ff00' : '#666666'}
        attributes={props.value && props.focused ? TextAttributes.BOLD | TextAttributes.INVERSE : props.value ? TextAttributes.BOLD : TextAttributes.DIM}
        onMouseDown={(e: any) => {
          if (e.button === 0 && !props.value) {
            props.onChange(true);
          }
        }}
      />
      <text
        content={`[${offLabel()}]`}
        fg={!props.value ? '#ff4444' : '#666666'}
        attributes={!props.value && props.focused ? TextAttributes.BOLD | TextAttributes.INVERSE : !props.value ? TextAttributes.BOLD : TextAttributes.DIM}
        onMouseDown={(e: any) => {
          if (e.button === 0 && props.value) {
            props.onChange(false);
          }
        }}
      />
    </box>
  );
}
