import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getScene } from "../server/demo-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

const endpointUrl = process.env.NEBIUS_ENDPOINT_URL ?? "";
const endpointPath = process.env.NEBIUS_ENDPOINT_PATH ?? "/v1/robotics/plan";
const healthPath = process.env.NEBIUS_HEALTH_PATH ?? "/health";
const endpointToken = process.env.NEBIUS_ENDPOINT_TOKEN ?? "";
const endpointKind = process.env.NEBIUS_ENDPOINT_KIND ?? "robotics";
const vlmModel = process.env.NEBIUS_VLM_MODEL ?? "qwen2.5-vl-3b";
const vlmMaxTokens = Number(process.env.NEBIUS_VLM_MAX_TOKENS ?? 900);
const vlmTemperature = Number(process.env.NEBIUS_VLM_TEMPERATURE ?? 0);
const timeoutMs = Number(process.env.LIVE_CHECK_TIMEOUT_MS ?? 15000);
const scene = getScene(process.env.LIVE_TEST_SCENE_ID ?? "tabletop-pick-place");
const prompt = process.env.LIVE_TEST_PROMPT ?? scene.prompt;

function requireEnv(name, value) {
  if (!value) {
    console.error(`${name} is required.`);
    process.exitCode = 2;
  }
}

function endpointUrlFor(pathValue) {
  return new URL(pathValue, endpointUrl.endsWith("/") ? endpointUrl : `${endpointUrl}/`);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(label, url, options) {
  const started = Date.now();
  const response = await fetchWithTimeout(url, options);
  const latencyMs = Date.now() - started;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status} after ${latencyMs} ms: ${text.slice(0, 240)}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  return { latencyMs, payload, status: response.status };
}

async function scenePngDataUrl(scene) {
  const png = await sharp(Buffer.from(scene.imageSvg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function inferencePayload() {
  if (endpointKind === "openai-vlm") {
    return {
      model: vlmModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Analyze this 640x420 robotics scene and instruction.",
                "Return only valid JSON with keys objects, selected_object, action_steps, trajectory, safety_notes, confidence.",
                "Use pixel coordinates for bbox and trajectory.",
                `Scene id: ${scene.id}`,
                `Instruction: ${prompt}`
              ].join("\n")
            },
            { type: "image_url", image_url: { url: await scenePngDataUrl(scene) } }
          ]
        }
      ],
      temperature: vlmTemperature,
      max_tokens: vlmMaxTokens
    };
  }

  return {
    scene_id: scene.id,
    prompt,
    image: `data:image/svg+xml;base64,${Buffer.from(scene.imageSvg).toString("base64")}`,
    image_format: "svg",
    response_schema: "robotics_plan_v1"
  };
}

async function main() {
  requireEnv("NEBIUS_ENDPOINT_URL", endpointUrl);
  requireEnv("NEBIUS_ENDPOINT_TOKEN", endpointToken);
  if (process.exitCode) return;

  const headers = { Authorization: `Bearer ${endpointToken}` };
  const health = await request("health check", endpointUrlFor(healthPath), { method: "GET", headers });

  const payload = await inferencePayload();
  const inference = await request("inference", endpointUrlFor(endpointPath), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseShape =
    typeof inference.payload === "string"
      ? "text"
      : Object.keys(inference.payload).slice(0, 8).join(", ") || "empty object";

  console.log(`Health check passed: HTTP ${health.status}, ${health.latencyMs} ms`);
  console.log(`Inference passed: HTTP ${inference.status}, ${inference.latencyMs} ms`);
  console.log(`Inference response shape: ${responseShape}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
