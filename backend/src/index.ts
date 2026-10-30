import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registerRoutes } from "./routes/index.js";
import { isTablet, isTabletAllowed } from "./tablet.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = Fastify({ logger: false });

app.addHook("onRequest", async (request, reply) => {
  if (isTablet(request) && !isTabletAllowed(request.method, request.url)) {
    return reply.code(403).send({ error: "Not available on the tablet" });
  }
});

app.register(async (api) => registerRoutes(api), { prefix: "/api" });

// In production the built client is served from the same origin as the API.
// In dev, Vite serves the client and proxies /api here.
const clientDist = fileURLToPath(
  new URL("../../frontend/azimeclient/dist/", import.meta.url)
);
if (existsSync(clientDist)) {
  app.register(fastifyStatic, { root: clientDist });
  app.setNotFoundHandler((request, reply) => {
    if (request.method === "GET" && !request.url.startsWith("/api/")) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "Not found" });
  });
}

const port = Number(process.env.PORT ?? 4000);

const start = async () => {
  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};
start();
