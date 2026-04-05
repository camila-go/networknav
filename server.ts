import "./server-env.js";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./src/lib/socket/index.js";
import type { AppSocketServer } from "./src/lib/socket/types.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Pass hostname/port into Next so dev HMR and `/_next/static/*` URLs stay consistent
// with the HTTP server (avoids broken chunks / 500s on scripts in some setups).
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  // Match Next custom-server docs: always pass a parsed URL. Helps avoid odd routing
  // for `/_next/static/*` in dev when Socket.io wraps the HTTP server.
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    void handler(req, res, parsedUrl).catch((err) => {
      console.error("Error handling request", req.method, req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("internal server error");
      }
    });
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  }) as unknown as AppSocketServer;

  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
