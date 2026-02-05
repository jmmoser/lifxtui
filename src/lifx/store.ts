// Reactive store for LIFX device state using Solid.js signals
import { batch } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { Device, DevicesInstance, ClientInstance } from 'lifxlan/index.js';
import { GetColorCommand, GetPowerCommand, GetLabelCommand, GetGroupCommand, GetVersionCommand, SetColorCommand, SetLightPowerCommand } from 'lifxlan/index.js';
import type { HSBK } from '../utils/colors';

// Device types based on LIFX product capabilities
export type DeviceType = 'light' | 'switch' | 'unknown';

// Known LIFX Switch product IDs
const SWITCH_PRODUCT_IDS = [70, 71, 89]; // LIFX Switch, LIFX Switch+

export interface DeviceState {
  serialNumber: string;
  device: Device;
  label: string;
  group: string;
  groupId: string;
  power: boolean;
  color: HSBK;
  online: boolean;
  selected: boolean;
  lastSeen: number;
  deviceType: DeviceType;
  productId: number;
}

export interface GroupState {
  id: string;
  label: string;
  devices: string[];
  expanded: boolean;
}

export interface LifxStore {
  devices: Record<string, DeviceState>;
  groups: Record<string, GroupState>;
  selectedDevices: string[];
  isScanning: boolean;
}

export function createLifxStore(devicesInstance: DevicesInstance, client: ClientInstance) {
  const [store, setStore] = createStore<LifxStore>({
    devices: {},
    groups: {},
    selectedDevices: [],
    isScanning: true,
  });

  // Track pending device queries to avoid duplicates
  const pendingQueries = new Set<string>();

  // Query device state
  async function queryDeviceState(device: Device) {
    const sn = device.serialNumber;
    if (pendingQueries.has(sn)) return;
    pendingQueries.add(sn);

    try {
      const [colorResult, labelResult, groupResult, versionResult] = await Promise.allSettled([
        client.send(GetColorCommand(), device),
        client.send(GetLabelCommand(), device),
        client.send(GetGroupCommand(), device),
        client.send(GetVersionCommand(), device),
      ]);

      batch(() => {
        // Determine device type from version info
        if (versionResult.status === 'fulfilled' && versionResult.value) {
          const versionVal = versionResult.value;
          const productId = versionVal.product ?? 0;
          setStore('devices', sn, 'productId', productId);

          // Check if it's a switch
          if (SWITCH_PRODUCT_IDS.includes(productId)) {
            setStore('devices', sn, 'deviceType', 'switch');
          } else {
            setStore('devices', sn, 'deviceType', 'light');
          }
        }

        // Only set color for lights (switches don't have color)
        // GetColorCommand returns LightState which includes hue, saturation, brightness, kelvin, power, label
        if (colorResult.status === 'fulfilled' && colorResult.value) {
          const { hue, saturation, brightness, kelvin, power } = colorResult.value;
          setStore('devices', sn, 'color', { hue, saturation, brightness, kelvin });
          // Power from GetColor is a number: 0 = off, 65535 = on
          if (power !== undefined) {
            setStore('devices', sn, 'power', power > 0);
          }
        }

        if (labelResult.status === 'fulfilled' && labelResult.value) {
          setStore('devices', sn, 'label', labelResult.value);
        }

        if (groupResult.status === 'fulfilled' && groupResult.value) {
          const groupVal = groupResult.value;
          const groupId = groupVal.group;
          const groupLabel = groupVal.label;

          setStore('devices', sn, 'group', groupLabel);
          setStore('devices', sn, 'groupId', groupId);

          // Update group
          if (!store.groups[groupId]) {
            setStore('groups', groupId, {
              id: groupId,
              label: groupLabel,
              devices: [sn],
              expanded: true,
            });
          } else if (!store.groups[groupId].devices.includes(sn)) {
            setStore('groups', groupId, 'devices', (devices) => [...devices, sn]);
          }
        }

        setStore('devices', sn, 'online', true);
        setStore('devices', sn, 'lastSeen', Date.now());
      });
    } catch (err) {
      // Device might be offline
      setStore('devices', sn, 'online', false);
    } finally {
      pendingQueries.delete(sn);
    }
  }

  // Register device when discovered
  function registerDevice(device: Device) {
    const sn = device.serialNumber;

    if (!store.devices[sn]) {
      setStore('devices', sn, {
        serialNumber: sn,
        device,
        label: sn.slice(-6), // Use last 6 chars as temp label
        group: '',
        groupId: '',
        power: false,
        color: { hue: 0, saturation: 0, brightness: 32768, kelvin: 3500 },
        online: true,
        selected: false,
        lastSeen: Date.now(),
        deviceType: 'unknown',
        productId: 0,
      });
    } else {
      setStore('devices', sn, 'device', device);
      setStore('devices', sn, 'lastSeen', Date.now());
    }

    // Query full state
    queryDeviceState(device);
  }

  // Selection management
  function toggleSelect(serialNumber: string) {
    const isSelected = store.devices[serialNumber]?.selected;
    setStore('devices', serialNumber, 'selected', !isSelected);
    updateSelectedList();
  }

  function selectDevice(serialNumber: string) {
    // Deselect all first
    Object.keys(store.devices).forEach((sn) => {
      setStore('devices', sn, 'selected', false);
    });
    setStore('devices', serialNumber, 'selected', true);
    updateSelectedList();
  }

  function selectAll() {
    Object.keys(store.devices).forEach((sn) => {
      if (store.devices[sn]?.online) {
        setStore('devices', sn, 'selected', true);
      }
    });
    updateSelectedList();
  }

  function selectNone() {
    Object.keys(store.devices).forEach((sn) => {
      setStore('devices', sn, 'selected', false);
    });
    updateSelectedList();
  }

  function selectGroup(groupId: string) {
    const group = store.groups[groupId];
    if (!group) return;

    // Check if all in group are selected
    const allSelected = group.devices.every((sn) => store.devices[sn]?.selected);

    group.devices.forEach((sn) => {
      if (store.devices[sn]?.online) {
        setStore('devices', sn, 'selected', !allSelected);
      }
    });
    updateSelectedList();
  }

  function updateSelectedList() {
    const selected = Object.keys(store.devices).filter((sn) => store.devices[sn]?.selected);
    setStore('selectedDevices', selected);
  }

  // Toggle group expansion
  function toggleGroup(groupId: string) {
    setStore('groups', groupId, 'expanded', (e) => !e);
  }

  // Control functions
  async function setColor(hsbk: HSBK, duration: number = 250) {
    const selected = store.selectedDevices;
    if (selected.length === 0) return;

    const promises = selected.map(async (sn) => {
      const deviceState = store.devices[sn];
      if (!deviceState?.online) return;

      try {
        client.unicast(
          SetColorCommand(hsbk.hue, hsbk.saturation, hsbk.brightness, hsbk.kelvin, duration),
          deviceState.device
        );
        setStore('devices', sn, 'color', { ...hsbk });
      } catch (err) {
        // Ignore errors for now
      }
    });

    await Promise.all(promises);
  }

  async function setPower(on: boolean, duration: number = 0) {
    const selected = store.selectedDevices;
    if (selected.length === 0) return;

    const promises = selected.map(async (sn) => {
      const deviceState = store.devices[sn];
      if (!deviceState?.online) return;

      try {
        client.unicast(
          SetLightPowerCommand(on, duration),
          deviceState.device
        );
        setStore('devices', sn, 'power', on);
      } catch (err) {
        // Ignore errors for now
      }
    });

    await Promise.all(promises);
  }

  async function togglePower() {
    const selected = store.selectedDevices;
    if (selected.length === 0) return;

    // Check if any are on
    const anyOn = selected.some((sn) => store.devices[sn]?.power);
    await setPower(!anyOn);
  }

  // Refresh all device states
  async function refreshAll() {
    setStore('isScanning', true);
    for (const device of devicesInstance) {
      await queryDeviceState(device);
    }
    setStore('isScanning', false);
  }

  // Get sorted device list for a group
  // Get sorted device list for a group (lights only, excludes switches)
  function getGroupDevices(groupId: string): DeviceState[] {
    const group = store.groups[groupId];
    if (!group) return [];
    return group.devices
      .map((sn) => store.devices[sn])
      .filter((d): d is DeviceState => d !== undefined && d.deviceType !== 'switch')
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // Get all groups sorted (filter out empty groups, only count lights)
  function getSortedGroups(): GroupState[] {
    return Object.values(store.groups)
      .filter((g) => {
        // Only include groups that have at least one light (not switch)
        const hasLights = g.devices.some((sn) => {
          const device = store.devices[sn];
          return device && device.deviceType !== 'switch';
        });
        return hasLights;
      })
      .sort((a, b) => {
        if (a.id === 'ungrouped') return 1;
        if (b.id === 'ungrouped') return -1;
        return a.label.localeCompare(b.label);
      });
  }

  return {
    store,
    registerDevice,
    toggleSelect,
    selectDevice,
    selectAll,
    selectNone,
    selectGroup,
    toggleGroup,
    setColor,
    setPower,
    togglePower,
    refreshAll,
    getGroupDevices,
    getSortedGroups,
  };
}

export type LifxStoreType = ReturnType<typeof createLifxStore>;
