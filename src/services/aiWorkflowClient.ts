export type AiWorkflowErrorCode =
  | "http_error"
  | "empty_response"
  | "invalid_json"
  | "network_error";

export class AiWorkflowError extends Error {
  code: AiWorkflowErrorCode;
  status?: number;
  details?: string;

  constructor(message: string, options: { code: AiWorkflowErrorCode; status?: number; details?: string }) {
    super(message);
    this.name = "AiWorkflowError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export type AiJsonWorkflowRequest = {
  body: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  url: string;
  workflowName: string;
};

export async function runJsonAiWorkflow<TResponse>({
  body,
  headers,
  signal,
  url,
  workflowName,
}: AiJsonWorkflowRequest): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new AiWorkflowError(`${workflowName} 网络请求失败。`, {
      code: "network_error",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new AiWorkflowError(`${workflowName} 调用失败：${response.status}`, {
      code: "http_error",
      status: response.status,
      details: responseText,
    });
  }

  if (!responseText.trim()) {
    throw new AiWorkflowError(`${workflowName} 未返回有效内容。`, {
      code: "empty_response",
      status: response.status,
    });
  }

  try {
    return JSON.parse(responseText) as TResponse;
  } catch (error) {
    throw new AiWorkflowError(`${workflowName} 返回内容不是合法 JSON。`, {
      code: "invalid_json",
      status: response.status,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export function extractJsonObject(text: string): string | undefined {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0];
}

export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
