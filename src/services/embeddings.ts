import { runJsonAiWorkflow } from "./aiWorkflowClient";

const EMBEDDING_API_PROXY_URL = import.meta.env.VITE_EMBEDDING_API_PROXY_URL ?? "/api/embeddings";
const EMBEDDING_MODEL = import.meta.env.VITE_EMBEDDING_MODEL || "text-embedding-v4";

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  output?: {
    embeddings?: Array<{
      embedding?: number[];
    }>;
  };
};

export function buildEmbeddingRequestBody(input: string, model = EMBEDDING_MODEL) {
  return {
    model,
    input,
  };
}

export async function generateTextEmbedding(input: string): Promise<number[]> {
  const data = await runJsonAiWorkflow<EmbeddingResponse>({
    url: EMBEDDING_API_PROXY_URL,
    workflowName: "例图向量检索",
    body: buildEmbeddingRequestBody(input),
  });
  const embedding = getEmbedding(data);

  if (!embedding) {
    throw new Error("例图向量检索未返回有效向量。");
  }

  return embedding;
}

export function parseEmbeddingResponse(content: EmbeddingResponse): number[] | undefined {
  return getEmbedding(content);
}

function getEmbedding(data: EmbeddingResponse): number[] | undefined {
  return data.data?.[0]?.embedding ?? data.output?.embeddings?.[0]?.embedding;
}
