// Staff in development: forwards localhost:3003 (STAFF_PORT) to this app on
// localhost:3000 (PORT), keeping the browser's Host header, so proxy.ts
// sees the staff host (NEXT_PUBLIC_STAFF_URL="http://localhost:3003") while
// the Pass's localhost cookie, which ignores ports, still signs staff in.
import net from "node:net";

const from = Number(process.env.STAFF_PORT ?? 3003);
const to = Number(process.env.PORT ?? 3000);

net
  .createServer((client) => {
    const upstream = net.connect(to, "127.0.0.1");
    const close = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("error", close);
    upstream.on("error", close);
    client.pipe(upstream).pipe(client);
  })
  .listen(from, () => {
    console.log(`Staff: http://localhost:${from} → localhost:${to}`);
  });
