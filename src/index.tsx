import { render } from "@opentui/solid";
import { Devices } from "lifxlan/index.js";
import { LifxClient } from "./lifx/client";
import { createLifxStore } from "./lifx/store";
import { createDJEngine } from "./lifx/effects";
import { App } from "./components/App";

// We'll set up the store after creating the devices instance
let storeRef: ReturnType<typeof createLifxStore> | null = null;

// Initialize LIFX client and device discovery
const devices = Devices({
  onAdded(device) {
    // Register with store when discovered
    if (storeRef) {
      storeRef.registerDevice(device);
    }
  }
});

const lifxClient = await LifxClient(devices);

// Create reactive store
const store = createLifxStore(devices, lifxClient.client);
storeRef = store;

// Create DJ engine
const djEngine = createDJEngine(lifxClient.client);

// Register any already-discovered devices
for (const device of devices) {
  store.registerDevice(device);
}

// Cleanup on exit
process.on('SIGINT', () => {
  djEngine.stop();
  lifxClient.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  djEngine.stop();
  lifxClient.close();
  process.exit(0);
});

// Render the app
render(() => (
  <App
    store={store}
    djEngine={djEngine}
    client={lifxClient.client}
  />
), { useMouse: true });
