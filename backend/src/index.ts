// server/index.js
import Fastify from "fastify";
import cors from "@fastify/cors";
//import { Deepgram } from '@deepgram/sdk';
import dotenv from "dotenv";
import { registerRoutes } from "./routes/index.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = Fastify({ logger: false });

// Initialize Deepgram
//const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
registerRoutes(app);
// Enable CORS for client-server communication
app.register(cors, { origin: "http://localhost:5173" }); // Update with your client's URL
app.ready().then(() => {
  console.log("Routes registered:", app.printRoutes());
});

// Test route
// app.get('/', async (request, reply) => {
//   return { message: 'Server is running!' };
// });

// Streaming Speech-to-Text Endpoint
// app.post('/stream', async (request, reply) => {
//   // This is a placeholder; you'll integrate WebSocket or streaming logic later
//   reply.send({ message: 'Streaming endpoint not implemented yet.' });
// });

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 4000 });
    console.log("Server listening on http://localhost:4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
