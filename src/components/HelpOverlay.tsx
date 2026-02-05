// Help overlay showing keyboard shortcuts
import { TextAttributes } from '@opentui/core';

interface HelpOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { key: 'Tab', desc: 'Switch panel' },
    { key: '↑/↓ or j/k', desc: 'Navigate list' },
    { key: '←/→ or h/l', desc: 'Adjust slider' },
    { key: 'Shift+←/→', desc: 'Fine adjust' },
  ]},
  { category: 'Selection', items: [
    { key: 'Space', desc: 'Toggle select' },
    { key: 'Enter', desc: 'Select only' },
    { key: 'a', desc: 'Select all' },
    { key: 'n', desc: 'Select none' },
    { key: 'g', desc: 'Select group' },
  ]},
  { category: 'Control', items: [
    { key: 'p', desc: 'Toggle power' },
    { key: '1-8', desc: 'Color presets' },
    { key: 'w', desc: 'Warm white' },
    { key: 'c', desc: 'Cool white' },
  ]},
  { category: 'Effects', items: [
    { key: 'e', desc: 'Stop effects' },
    { key: 'd', desc: 'DJ mode' },
    { key: 't', desc: 'Tap tempo (DJ)' },
  ]},
  { category: 'Scenes', items: [
    { key: 's', desc: 'Save scene' },
    { key: 'F1-F6', desc: 'Quick scenes' },
  ]},
  { category: 'General', items: [
    { key: '?', desc: 'Toggle help' },
    { key: 'r', desc: 'Refresh devices' },
    { key: 'q / Ctrl+C', desc: 'Quit' },
  ]},
];

export function HelpOverlay(props: HelpOverlayProps) {
  return (
    <box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="#000000cc"
      alignItems="center"
      justifyContent="center"
    >
      <box
        flexDirection="column"
        borderStyle="rounded"
        border={true}
        borderColor="#4488ff"
        backgroundColor="#1a1a2e"
        padding={2}
        width={60}
      >
        {/* Title */}
        <box flexDirection="row" justifyContent="center" marginBottom={1}>
          <ascii_font font="tiny" text="HELP" />
        </box>

        {/* Shortcuts grid */}
        <box flexDirection="row" flexWrap="wrap" gap={2}>
          {SHORTCUTS.map((section) => (
            <box flexDirection="column" width={26} marginBottom={1}>
              <text
                content={section.category}
                fg="#4488ff"
                attributes={TextAttributes.BOLD}
              />
              {section.items.map((item) => (
                <box flexDirection="row" height={1}>
                  <text
                    content={item.key.padEnd(12)}
                    fg="#ffaa00"
                  />
                  <text
                    content={item.desc}
                    attributes={TextAttributes.DIM}
                  />
                </box>
              ))}
            </box>
          ))}
        </box>

        {/* Close hint */}
        <box flexDirection="row" justifyContent="center" marginTop={1}>
          <text content="Press any key to close" attributes={TextAttributes.DIM} />
        </box>
      </box>
    </box>
  );
}
