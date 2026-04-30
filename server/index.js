import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { existsSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getScene, sceneSummary, scenes } from "./demo-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = Number(process.env.SERVER_PORT ?? 8787);
const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const endpointUrl = process.env.NEBIUS_ENDPOINT_URL ?? "";
const endpointPath = process.env.NEBIUS_ENDPOINT_PATH ?? "/v1/robotics/plan";
const healthPath = process.env.NEBIUS_HEALTH_PATH ?? "/health";
const endpointToken = process.env.NEBIUS_ENDPOINT_TOKEN ?? "";
const endpointKind = process.env.NEBIUS_ENDPOINT_KIND ?? "robotics";
const vlmModel = process.env.NEBIUS_VLM_MODEL ?? "qwen2.5-vl-3b";
const vlmTemperature = Number(process.env.NEBIUS_VLM_TEMPERATURE ?? 0);
const vlmMaxTokens = Number(process.env.NEBIUS_VLM_MAX_TOKENS ?? 900);
const modelImage = process.env.NEBIUS_MODEL_IMAGE ?? "registry.example.com/robotics/cosmos-reason:demo";
const gpuClass = process.env.NEBIUS_GPU_CLASS ?? "GPU-backed Serverless AI endpoint";
const shmSize = process.env.NEBIUS_SHM_SIZE ?? "16Gi";
const allowFallback = (process.env.ALLOW_FALLBACK_ON_ERROR ?? "true") !== "false";
const coldStartThresholdMs = Number(process.env.COLD_START_THRESHOLD_MS ?? 2500);
const liveCheckTimeoutMs = Number(process.env.LIVE_CHECK_TIMEOUT_MS ?? 15000);
const recordLiveResponses = (process.env.RECORD_LIVE_RESPONSES ?? "false") === "true";
const replayRecordingsPath = path.resolve(rootDir, process.env.REPLAY_RECORDINGS_PATH ?? "server/replay-recordings.jsonl");

const validModes = new Set(["live", "replay", "offline"]);
let activeMode = validModes.has(process.env.DEMO_MODE) ? process.env.DEMO_MODE : "offline";
let observedLiveRequest = false;

const stats = {
  requestCount: 0,
  errorCount: 0,
  lastLatencyMs: null,
  lastMode: activeMode,
  lastStatus: activeMode,
  startedAt: new Date().toISOString()
};

app.disable("x-powered-by");
if (corsOrigin === "*") {
  app.use(cors());
} else {
  app.use(cors({ origin: corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean) }));
}
app.use(express.json({ limit: "12mb" }));
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

function clamp01(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function isBox(value) {
  return Array.isArray(value) && value.length === 4 && value.every((item) => Number.isFinite(Number(item)));
}

function isPoint(value) {
  return value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y));
}

function asStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extractJsonPayload(raw) {
  if (!raw) return null;
  if (typeof raw === "object") {
    const content = raw?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return extractJsonPayload(content);
    }
    return raw;
  }

  const text = String(raw).trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function configuredMissing() {
  return [
    ["NEBIUS_ENDPOINT_URL", endpointUrl],
    ["NEBIUS_ENDPOINT_TOKEN", endpointToken]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

function endpointUrlFor(pathValue) {
  return new URL(pathValue, endpointUrl.endsWith("/") ? endpointUrl : `${endpointUrl}/`);
}

function endpointHeaders(extra = {}) {
  return {
    ...(endpointToken ? { Authorization: `Bearer ${endpointToken}` } : {}),
    ...extra
  };
}

async function scenePngDataUrl(scene) {
  const png = await sharp(Buffer.from(scene.imageSvg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function roboticsSchemaPrompt(scene, prompt) {
  return [
    "You are a visual-language robotics planning model.",
    "Analyze the provided 640x420 robotics scene image and the user instruction.",
    "Return only valid JSON. Do not include markdown fences or explanatory text.",
    "Use pixel coordinates in the original 640x420 image for bounding boxes and trajectory points.",
    "The JSON schema is:",
    "{\"objects\":[{\"name\":\"string\",\"bbox\":[x1,y1,x2,y2],\"confidence\":0.0}],\"selected_object\":\"string\",\"action_steps\":[\"string\"],\"trajectory\":[{\"x\":0,\"y\":0}],\"safety_notes\":[\"string\"],\"confidence\":0.0}",
    `Scene id: ${scene.id}`,
    `Scene title: ${scene.title}`,
    `User instruction: ${prompt}`
  ].join("\n");
}

async function endpointPayload(scene, prompt) {
  if (endpointKind === "openai-vlm") {
    return {
      model: vlmModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: roboticsSchemaPrompt(scene, prompt) },
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

function safeErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(endpointToken, endpointToken ? "[redacted]" : "")
    .slice(0, 320);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePlan(rawResponse, fallback, metadata = {}) {
  const raw = extractJsonPayload(rawResponse) ?? {};
  const source = raw.robotics_plan ?? raw.plan ?? raw;
  const fallbackObjects = fallback.objects ?? [];
  const objects = Array.isArray(source.objects)
    ? source.objects
        .map((object, index) => ({
          name: String(object?.name ?? fallbackObjects[index]?.name ?? `object ${index + 1}`),
          bbox: isBox(object?.bbox) ? object.bbox.map(Number) : fallbackObjects[index]?.bbox,
          confidence: clamp01(object?.confidence, fallbackObjects[index]?.confidence ?? 0.75)
        }))
        .filter((object) => object.name && isBox(object.bbox))
    : fallbackObjects;

  const fallbackTrajectory = fallback.trajectory ?? [];
  const trajectory = Array.isArray(source.trajectory)
    ? source.trajectory
        .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
        .filter(isPoint)
    : fallbackTrajectory;

  return {
    objects: objects.length > 0 ? objects : fallbackObjects,
    selected_object: String(source.selected_object ?? source.selectedObject ?? fallback.selected_object ?? "none"),
    action_steps: asStringArray(source.action_steps ?? source.actionSteps, fallback.action_steps ?? []),
    trajectory: trajectory.length > 0 ? trajectory : fallbackTrajectory,
    safety_notes: asStringArray(source.safety_notes ?? source.safetyNotes, fallback.safety_notes ?? []),
    confidence: clamp01(source.confidence, fallback.confidence ?? 0.75),
    latency_ms: Number(metadata.latencyMs ?? source.latency_ms ?? fallback.latency_ms ?? 0),
    serverless_status: String(metadata.serverlessStatus ?? source.serverless_status ?? fallback.serverless_status ?? activeMode),
    mode: metadata.mode ?? activeMode,
    source: metadata.source ?? "normalized"
  };
}

function replayLatency(sceneId) {
  const index = Math.max(0, scenes.findIndex((scene) => scene.id === sceneId));
  return 580 + index * 47;
}

async function latestReplayPlan(sceneId) {
  if (!existsSync(replayRecordingsPath)) return null;

  const contents = await readFile(replayRecordingsPath, "utf8");
  const lines = contents.split("\n").filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.sceneId === sceneId && record.plan) {
        return record.plan;
      }
    } catch {
      // Ignore malformed local rehearsal lines and keep scanning older records.
    }
  }

  return null;
}

async function makeReplayResponse(scene, mode = activeMode, metadata = {}) {
  if (mode === "replay") {
    const recordedPlan = await latestReplayPlan(scene.id);
    if (recordedPlan) {
      return normalizePlan(recordedPlan, scene.expected, {
        latencyMs: metadata.latencyMs ?? recordedPlan.latency_ms ?? replayLatency(scene.id),
        mode,
        serverlessStatus: metadata.serverlessStatus ?? "warm",
        source: "recorded-live-replay"
      });
    }
  }

  const latencyMs = metadata.latencyMs ?? (mode === "offline" ? 18 : replayLatency(scene.id));
  return normalizePlan(scene.expected, scene.expected, {
    latencyMs,
    mode,
    serverlessStatus: mode === "offline" ? "offline" : "warm",
    source: mode === "offline" ? "bundled-offline" : "bundled-replay"
  });
}

function statusPayload() {
  return {
    ok: true,
    mode: activeMode,
    endpointConfigured: Boolean(endpointUrl && endpointToken),
    endpointKind,
    endpointPath,
    healthPath,
    requestCount: stats.requestCount,
    errorCount: stats.errorCount,
    lastLatencyMs: stats.lastLatencyMs,
    lastMode: stats.lastMode,
    lastStatus: stats.lastStatus,
    modelImage,
    gpuClass,
    shmSize,
    replayRecordingEnabled: recordLiveResponses,
    startedAt: stats.startedAt
  };
}

async function callNebiusEndpoint(scene, prompt) {
  const missing = configuredMissing();
  if (missing.length > 0) {
    throw new Error(`${missing.join(" and ")} required for live mode.`);
  }

  const url = endpointUrlFor(endpointPath);
  const payload = await endpointPayload(scene, prompt);

  const started = nowMs();
  const response = await fetch(url, {
    method: "POST",
    headers: endpointHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  const latencyMs = nowMs() - started;
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Nebius endpoint returned ${response.status}: ${text.slice(0, 220)}`);
  }

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = text;
  }

  const serverlessStatus = !observedLiveRequest || latencyMs >= coldStartThresholdMs ? "cold" : "warm";
  observedLiveRequest = true;
  const plan = normalizePlan(raw, scene.expected, {
    latencyMs,
    mode: "live",
    serverlessStatus,
    source: "nebius-serverless"
  });
  if (recordLiveResponses) {
    await appendFile(
      replayRecordingsPath,
      `${JSON.stringify({ recordedAt: new Date().toISOString(), sceneId: scene.id, prompt, plan })}\n`
    );
  }
  return plan;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "nebius-serverless-robotics-demo", mode: activeMode });
});

app.get("/api/status", (_request, response) => {
  response.json(statusPayload());
});

app.post("/api/live-check", async (_request, response) => {
  const missing = configuredMissing();
  if (missing.length > 0) {
    response.status(400).json({
      ok: false,
      configured: false,
      missing,
      status: statusPayload()
    });
    return;
  }

  const started = nowMs();
  try {
    const endpointResponse = await fetchWithTimeout(
      endpointUrlFor(healthPath),
      { method: "GET", headers: endpointHeaders() },
      liveCheckTimeoutMs
    );
    const latencyMs = nowMs() - started;
    const body = await endpointResponse.text();
    response.status(endpointResponse.ok ? 200 : 502).json({
      ok: endpointResponse.ok,
      configured: true,
      httpStatus: endpointResponse.status,
      latencyMs,
      healthPath,
      bodyPreview: body.slice(0, 240),
      status: statusPayload()
    });
  } catch (error) {
    response.status(502).json({
      ok: false,
      configured: true,
      error: safeErrorMessage(error),
      healthPath,
      status: statusPayload()
    });
  }
});

app.get("/api/scenes", (_request, response) => {
  response.json({ scenes: scenes.map(sceneSummary) });
});

app.post("/api/mode", (request, response) => {
  const mode = String(request.body?.mode ?? "");
  if (!validModes.has(mode)) {
    response.status(400).json({ error: "Mode must be one of: live, replay, offline." });
    return;
  }
  activeMode = mode;
  stats.lastMode = mode;
  stats.lastStatus = mode;
  response.json(statusPayload());
});

app.post("/api/infer", async (request, response) => {
  const scene = getScene(String(request.body?.sceneId ?? ""));
  const prompt = String(request.body?.prompt ?? scene.prompt).trim() || scene.prompt;
  stats.requestCount += 1;

  try {
    let plan;
    if (activeMode === "live") {
      plan = await callNebiusEndpoint(scene, prompt);
    } else {
      plan = await makeReplayResponse(scene, activeMode);
    }

    stats.lastLatencyMs = plan.latency_ms;
    stats.lastMode = plan.mode;
    stats.lastStatus = plan.serverless_status;
    response.json({
      sceneId: scene.id,
      prompt,
      plan,
      status: statusPayload()
    });
  } catch (error) {
    stats.errorCount += 1;
    if (allowFallback) {
      const plan = await makeReplayResponse(scene, "replay", { latencyMs: replayLatency(scene.id) });
      stats.lastLatencyMs = plan.latency_ms;
      stats.lastMode = "replay";
      stats.lastStatus = "live-fallback";
      response.json({
        sceneId: scene.id,
        prompt,
        plan: {
          ...plan,
          serverless_status: "live-fallback",
          safety_notes: [
            ...plan.safety_notes,
            "Live endpoint was unavailable; replay fallback was used for stage continuity."
          ]
        },
        warning: safeErrorMessage(error),
        status: statusPayload()
      });
      return;
    }

    response.status(502).json({ error: safeErrorMessage(error), status: statusPayload() });
  }
});

app.use(express.static(distDir));
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Nebius Serverless Robotics Demo backend listening on http://127.0.0.1:${port}`);
});
