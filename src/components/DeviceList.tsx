// Device list panel with groups
import { For, Show, createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { LifxStoreType, DeviceState, GroupState } from '../lifx/store';
import { hsbkToHex } from '../utils/colors';

interface DeviceListProps {
  store: LifxStoreType;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onActivate?: () => void;
}

interface FlatListItem {
  type: 'group' | 'device';
  id: string;
  groupId?: string;
}

export function DeviceList(props: DeviceListProps) {
  // Flatten groups and devices into a navigable list
  const flatList = createMemo((): FlatListItem[] => {
    const items: FlatListItem[] = [];
    const groups = props.store.getSortedGroups();

    for (const group of groups) {
      items.push({ type: 'group', id: group.id });

      if (group.expanded) {
        const devices = props.store.getGroupDevices(group.id);
        for (const device of devices) {
          items.push({ type: 'device', id: device.serialNumber, groupId: group.id });
        }
      }
    }

    return items;
  });

  const deviceCount = createMemo(() => Object.keys(props.store.store.devices).length);
  const selectedCount = createMemo(() => props.store.store.selectedDevices.length);

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      border={true}
      title=" Devices "
      titleAlignment="left"
      padding={1}
      width={28}
      flexShrink={0}
      onMouseDown={() => props.onActivate?.()}
    >
      {/* Device stats */}
      <text
        content={`${deviceCount()} found, ${selectedCount()} selected`}
        attributes={TextAttributes.DIM}
      />
      <text content="" />

      {/* Scrollable device list */}
      <scrollbox flexGrow={1} scrollY={true}>
        <For each={flatList()}>
          {(item, index) => (
            <Show
              when={item.type === 'group'}
              fallback={
                <DeviceRow
                  device={props.store.store.devices[item.id]!}
                  focused={index() === props.focusedIndex}
                  onFocus={() => props.onFocusChange(index())}
                  onToggleSelect={() => {
                    props.onFocusChange(index());
                    props.store.toggleSelect(item.id);
                  }}
                />
              }
            >
              <GroupRow
                group={props.store.store.groups[item.id]!}
                focused={index() === props.focusedIndex}
                onToggle={() => {
                  props.onFocusChange(index());
                  props.store.toggleGroup(item.id);
                }}
                onSelect={() => {
                  props.onFocusChange(index());
                  props.store.selectGroup(item.id);
                }}
              />
            </Show>
          )}
        </For>
      </scrollbox>

      {/* Hints */}
      <box marginTop={1} flexDirection="column">
        <text content="[a]ll [n]one" attributes={TextAttributes.DIM} height={1} />
        <text content="[Space] toggle" attributes={TextAttributes.DIM} height={1} />
      </box>
    </box>
  );
}

interface GroupRowProps {
  group: GroupState;
  focused: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

function GroupRow(props: GroupRowProps) {
  const arrow = () => props.group.expanded ? '▼' : '▶';
  const deviceCount = () => props.group.devices.length;

  return (
    <box
      flexDirection="row"
      height={1}
      onMouseDown={(e: any) => {
        if (e.button === 0) {
          if (e.shift) {
            props.onSelect();
          } else {
            props.onToggle();
          }
        }
      }}
    >
      <text
        content={`${arrow()} ${props.group.label} (${deviceCount()})`}
        attributes={props.focused ? TextAttributes.BOLD | TextAttributes.INVERSE : TextAttributes.BOLD}
        fg={props.focused ? '#000000' : '#ffffff'}
        bg={props.focused ? '#4488ff' : undefined}
      />
    </box>
  );
}

interface DeviceRowProps {
  device: DeviceState;
  focused: boolean;
  onFocus: () => void;
  onToggleSelect: () => void;
}

function DeviceRow(props: DeviceRowProps) {
  const colorHex = createMemo(() => {
    if (!props.device.power) return '#333333';
    return hsbkToHex(props.device.color);
  });

  const statusIcon = () => {
    if (!props.device.online) return '○';
    return props.device.power ? '●' : '○';
  };

  const statusColor = () => {
    if (!props.device.online) return '#666666';
    return props.device.power ? colorHex() : '#666666';
  };

  const checkbox = () => props.device.selected ? '◉' : '○';

  return (
    <box
      flexDirection="row"
      height={1}
      gap={1}
      paddingLeft={2}
      onMouseDown={(e: any) => {
        if (e.button === 0) {
          if (e.shift) {
            props.onToggleSelect();
          } else {
            props.onFocus();
          }
        }
      }}
    >
      <text
        content={checkbox()}
        fg={props.device.selected ? '#00ff00' : '#666666'}
      />
      <text
        content={statusIcon()}
        fg={statusColor()}
      />
      <text
        content={props.device.label.slice(0, 16)}
        attributes={props.focused ? TextAttributes.INVERSE : TextAttributes.NONE}
        fg={props.focused ? '#000000' : props.device.online ? '#ffffff' : '#666666'}
        bg={props.focused ? '#4488ff' : undefined}
      />
    </box>
  );
}

export function getFlatList(store: LifxStoreType): FlatListItem[] {
  const items: FlatListItem[] = [];
  const groups = store.getSortedGroups();

  for (const group of groups) {
    items.push({ type: 'group', id: group.id });

    if (group.expanded) {
      const devices = store.getGroupDevices(group.id);
      for (const device of devices) {
        items.push({ type: 'device', id: device.serialNumber, groupId: group.id });
      }
    }
  }

  return items;
}
