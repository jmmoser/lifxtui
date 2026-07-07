import dgram from 'node:dgram';
import { Client, Router, GetServiceCommand, type DevicesInstance } from 'lifxlan/index.js';

export async function LifxClient(devices: DevicesInstance) {
  const socket = dgram.createSocket('udp4');

  let sendCounter = 0;
  let socketShouldClose = false;

  function socketCallback() {
    sendCounter--;
    if (socketShouldClose && sendCounter <= 0) {
      socket.close();
    }
  }

  const router = Router({
    onSend(message, port, address) {
      sendCounter++;
      socket.send(message, port, address, socketCallback);
    },
  });

  const client = Client({ router });

  function onMessage(message: Uint8Array, remote: { port: number; address: string; }) {
    // A malformed or non-LIFX datagram makes decodeHeader throw, which would
    // be an uncaught exception inside the socket event handler and kill the
    // process. Drop such packets instead.
    try {
      const { header, serialNumber } = router.receive(message);
      devices.register(serialNumber, remote.port, remote.address, header.target);
    } catch {
      // Not a valid LIFX message — ignore it
    }
  }

  socket.on('message', onMessage);

  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.once('listening', resolve);
    socket.bind();
  });

  socket.setBroadcast(true);

  client.broadcast(GetServiceCommand());
  const scanInterval = setInterval(() => {
    client.broadcast(GetServiceCommand());
  }, 500);

  return {
    devices,
    client,
    router,
    close() {
      clearInterval(scanInterval);
      socketShouldClose = true;
      // Close immediately if no sends are in flight; otherwise the last
      // socketCallback will close it. Don't decrement the counter here — that
      // would double-count and could close the socket before pending sends
      // complete.
      if (sendCounter <= 0) {
        socket.close();
      }
    }
  };
}

export type LifxClientInstance = Awaited<ReturnType<typeof LifxClient>>;
