import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

await loadEnvFile(path.join(root, ".env"));
await loadEnvFile(path.join(root, ".env.local"));

const inputPath = path.join(root, "src", "data", "critiqueImageCases.json");
const outputPath = dryRun
  ? path.join(root, "src", "data", "critiqueCaseEmbeddingTexts.json")
  : path.join(root, "src", "data", "critiqueCaseVectors.json");

const cases = JSON.parse(await readFile(inputPath, "utf8"));
const items = cases.map((item) => ({
  ...item,
  embeddingText: buildEmbeddingText(item),
}));

if (dryRun) {
  await writeJson(outputPath, {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    items,
  });
  console.log(`Dry run complete. Wrote ${items.length} embedding texts to ${relative(outputPath)}.`);
  process.exit(0);
}

const config = getEmbeddingConfig();

if (!config.apiKey) {
  throw new Error(
    [
      "Missing embedding API key.",
      "Put DASHSCOPE_API_KEY=your_key in .env.local, or set EMBEDDING_API_KEY.",
      "You can run npm.cmd run embed:cases:dry first to inspect the text that will be embedded.",
    ].join("\n"),
  );
}

const embeddedItems = [];

for (const [index, item] of items.entries()) {
  console.log(`[${index + 1}/${items.length}] Embedding ${item.id}...`);
  const embedding = await fetchEmbedding(item.embeddingText, config);
  embeddedItems.push({
    ...item,
    embedding,
  });
}

await writeJson(outputPath, {
  generatedAt: new Date().toISOString(),
  model: config.model,
  dimensions: embeddedItems[0]?.embedding.length ?? 0,
  items: embeddedItems,
});

console.log(`Done. Wrote ${embeddedItems.length} vectors to ${relative(outputPath)}.`);

function buildEmbeddingText(item) {
  return [
    `图片ID：${item.id}`,
    `图片路径：${item.imageUrl}`,
    `标题：${item.title}`,
    `院校：${item.schoolName}`,
    `题目：${item.sketchTitle}`,
    `质量：${item.quality}`,
    `标签：${joinList(item.tags)}`,
    `专家点评：${item.expertReview}`,
    `优点：${joinList(item.strengths)}`,
    `问题：${joinList(item.issues)}`,
    `建议：${joinList(item.suggestions)}`,
  ].join("\n");
}

async function fetchEmbedding(input, config) {
  const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}\n${responseText}`);
  }

  const data = JSON.parse(responseText);
  const embedding = data?.data?.[0]?.embedding ?? data?.output?.embeddings?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error(`Embedding response did not include a vector.\n${responseText}`);
  }

  return embedding;
}

function getEmbeddingConfig() {
  return {
    apiBaseUrl:
      process.env.EMBEDDING_API_BASE_URL ||
      process.env.DASHSCOPE_API_BASE_URL ||
      process.env.QWEN_API_BASE_URL ||
      process.env.VITE_DASHSCOPE_API_BASE_URL ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey:
      process.env.EMBEDDING_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      process.env.QWEN_API_KEY ||
      process.env.VITE_DASHSCOPE_API_KEY ||
      process.env.VITE_QWEN_API_KEY ||
      "",
    model: process.env.EMBEDDING_MODEL || "text-embedding-v4",
  };
}

async function loadEnvFile(filePath) {
  let content = "";

  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = stripQuotes(trimmed.slice(separator + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function joinList(items) {
  return Array.isArray(items) && items.length > 0 ? items.join("、") : "无";
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}
