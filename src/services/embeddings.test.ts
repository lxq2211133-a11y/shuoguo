import { describe, expect, it } from "vitest";
import { buildEmbeddingRequestBody, parseEmbeddingResponse } from "./embeddings";

describe("embedding service", () => {
  it("builds an OpenAI-compatible embedding request body", () => {
    expect(buildEmbeddingRequestBody("hello", "embedding-model")).toEqual({
      model: "embedding-model",
      input: "hello",
    });
  });

  it("parses OpenAI-compatible embedding responses", () => {
    expect(parseEmbeddingResponse({ data: [{ embedding: [0.1, 0.2] }] })).toEqual([0.1, 0.2]);
  });

  it("parses DashScope output embedding responses", () => {
    expect(parseEmbeddingResponse({ output: { embeddings: [{ embedding: [0.3, 0.4] }] } })).toEqual([0.3, 0.4]);
  });
});
