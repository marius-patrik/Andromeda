import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { KnowledgeBase } from "@okf-agent/core";
import { buildMcpServer } from "./server.js";

/**
 * CORS for the /mcp endpoint. We can't rely on @fastify/cors here because the
 * handler calls reply.hijack() — after which Fastify's reply lifecycle (where
 * @fastify/cors injects its headers) no longer runs. So we set the headers
 * directly on the raw response instead. Mcp-Session-Id must be exposed so
 * browser clients can read it back off the initialize response.
 */
function setMcpCors(request: FastifyRequest, res: import("node:http").ServerResponse): void {
  const origin = request.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
  if (origin) res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    request.headers["access-control-request-headers"] ??
      "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/**
 * Mount MCP streamable-HTTP at /mcp. Stateless mode: a fresh transport per
 * request (no session store) — simple and horizontally safe; the KB itself
 * serializes mutations.
 */
export function registerMcpHttp(app: FastifyInstance, kb: KnowledgeBase): void {
  // Preflight — answered here (not by @fastify/cors) so /mcp owns its CORS end to end.
  app.options("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    setMcpCors(request, reply.raw);
    reply.hijack();
    reply.raw.writeHead(204);
    reply.raw.end();
  });

  app.route({
    method: ["POST", "GET", "DELETE"],
    url: "/mcp",
    handler: async (request, reply) => {
      setMcpCors(request, reply.raw);
      const server = buildMcpServer(kb);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      reply.hijack();
      request.raw.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    },
  });
}
