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
    const { header, serialNumber } = router.receive(message);
    devices.register(serialNumber, remote.port, remote.address, header.target);
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
