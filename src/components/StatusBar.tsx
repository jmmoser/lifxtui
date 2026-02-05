// Bottom status bar
import { createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType } from '../lifx/store';
import type { DJEngine } from '../lifx/effects';

interface StatusBarProps {
  store: LifxStoreType;
  djEngine: DJEngine;
  activePanel: string;
}

export function StatusBar(props: StatusBarProps) {
  const deviceCount = createMemo(() => Object.keys(props.store.store.devices).length);
  const onlineCount = createMemo(() =>
    Object.values(props.store.store.devices).filter((d) => d.online).length
  );
  const selectedCount = createMemo(() => props.store.store.selectedDevices.length);

  const djStatus = createMemo(() => {
    if (props.djEngine.isRunning()) {
      const cfg = props.djEngine.config();
      return `DJ: ${cfg.bpm} BPM - ${cfg.pattern}`;
    }
    return '';
  });

  return (
    <box
      flexDirection="row"
      height={1}
      backgroundColor="#1a1a2e"
      paddingLeft={1}
      paddingRight={1}
      gap={2}
    >
      {/* Network status */}
      <text
        content={`${onlineCount()}/${deviceCount()} online`}
        fg={onlineCount() === deviceCount() ? '#00ff00' : '#ffaa00'}
      />

      <text content="│" attributes={TextAttributes.DIM} />

      {/* Selection */}
      <text
        content={selectedCount() > 0 ? `${selectedCount()} selected` : 'none selected'}
        fg={selectedCount() > 0 ? '#4488ff' : '#666666'}
      />

      {/* DJ status */}
      {djStatus() && (
        <>
          <text content="│" attributes={TextAttributes.DIM} />
          <text content={djStatus()} fg="#ff00ff" attributes={TextAttributes.BOLD} />
        </>
      )}

      {/* Spacer */}
      <box flexGrow={1} />

      {/* Active panel indicator */}
      <text content={`[${props.activePanel}]`} attributes={TextAttributes.DIM} />

      <text content="│" attributes={TextAttributes.DIM} />

      {/* Help hint */}
      <text content="[?] help  [q] quit" attributes={TextAttributes.DIM} />
    </box>
  );
}
