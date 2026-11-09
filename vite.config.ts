import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildUpstreamDeepSeekRequest } from "./server/deepseekProxy";
import { buildUpstreamEmbeddingRequest } from "./server/embeddingProxy";
import { buildUpstreamVisionRequest, readRequestBody } from "./server/visionProxy";
import { createStudyApi } from "./server/studyApi.mjs";

function attachVisionCritiqueProxy(server: {
  config: { mode: string };
  middlewares: {
    use: (
      path: string,
      handler: (
        request: Parameters<typeof readRequestBody>[0] & { method?: string },
        response: {
          end: (body?: string) => void;
          setHeader: (name: string, value: string) => void;
          statusCode: number;
        },
        next: () => void,
      ) => void,
    ) => void;
  };
}) {
  server.middlewares.use("/api/vision-critique", async (request, response, next) => {
    if (request.method !== "POST") {
      next();
      return;
    }

    try {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const rawBody = await readRequestBody(request);
      const upstream = buildUpstreamVisionRequest(rawBody, env);
      const upstreamResponse = await fetch(upstream.url, upstream.init);
      const responseText = await upstreamResponse.text();

      response.statusCode = upstreamResponse.status;
      response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json");
      response.end(responseText);
    } catch (error) {
      console.error("[vision-critique-proxy]", error);
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Vision critique proxy is not configured." }));
    }
  });
}

function attachDeepSeekProxy(server: {
  config: { mode: string };
  middlewares: {
    use: (
      path: string,
      handler: (
        request: Parameters<typeof readRequestBody>[0] & { method?: string },
        response: {
          end: (body?: string) => void;
          setHeader: (name: string, value: string) => void;
          statusCode: number;
        },
        next: () => void,
      ) => void,
    ) => void;
  };
}) {
  server.middlewares.use("/api/deepseek-chat", async (request, response, next) => {
    if (request.method !== "POST") {
      next();
      return;
    }

    try {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const rawBody = await readRequestBody(request);
      const upstream = buildUpstreamDeepSeekRequest(rawBody, env);
      const upstreamResponse = await fetch(upstream.url, upstream.init);
      const responseText = await upstreamResponse.text();

      response.statusCode = upstreamResponse.status;
      response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json");
      response.end(responseText);
    } catch (error) {
      console.error("[deepseek-chat-proxy]", error);
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "DeepSeek proxy is not configured." }));
    }
  });
}

function attachEmbeddingProxy(server: {
  config: { mode: string };
  middlewares: {
    use: (
      path: string,
      handler: (
        request: Parameters<typeof readRequestBody>[0] & { method?: string },
        response: {
          end: (body?: string) => void;
          setHeader: (name: string, value: string) => void;
          statusCode: number;
        },
        next: () => void,
      ) => void,
    ) => void;
  };
}) {
  server.middlewares.use("/api/embeddings", async (request, response, next) => {
    if (request.method !== "POST") {
      next();
      return;
    }

    try {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const rawBody = await readRequestBody(request);
      const upstream = buildUpstreamEmbeddingRequest(rawBody, env);
      const upstreamResponse = await fetch(upstream.url, upstream.init);
      const responseText = await upstreamResponse.text();

      response.statusCode = upstreamResponse.status;
      response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json");
      response.end(responseText);
    } catch (error) {
      console.error("[embeddings-proxy]", error);
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Embedding proxy is not configured." }));
    }
  });
}

function aiWorkflowProxy(): Plugin {
  return {
    name: "ai-workflow-proxy",
    configureServer(server) {
      server.middlewares.use("/api/study", createStudyApi());
      attachVisionCritiqueProxy(server);
      attachDeepSeekProxy(server);
      attachEmbeddingProxy(server);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/study", createStudyApi());
      attachVisionCritiqueProxy(server);
      attachDeepSeekProxy(server);
      attachEmbeddingProxy(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), aiWorkflowProxy()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
