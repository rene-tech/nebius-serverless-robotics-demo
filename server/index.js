import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getScene, sceneSummary, scenes } from "./demo-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const app = express();
const port = Number(process.env.SERVER_PORT ?? 8787);
const endpointUrl = process.env.NEBIUS_ENDPOINT_URL ?? "";
const endpointPath = process.env.NEBIUS_ENDPOINT_PATH ?? "/v1/robotics/plan";
const endpointToken = process.env.NEBIUS_ENDPOINT_TOKEN ?? "";
const modelImage = process.env.NEBIUS_MODEL_IMAGE ?? "registry.example.com/robotics/cosmos-reason:demo";
const gpuClass = process.env.NEBIUS_GPU_CLASS ?? "GPU-backed Serverless AI endpoint";
const shmSize = process.env.NEBIUS_SHM_SIZE ?? "16Gi";
const allowFallback = (process.env.ALLOW_FALLBACK_ON_ERROR ?? "true") !== "false";
const coldStartThresholdMs = Number(process.env.COLD_START_THRESHOLD_MS ?? 2500);

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

app.use(cors());
app.use(express.json({ limit: "12mb" }));

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

function makeReplayResponse(scene, mode = activeMode, metadata = {}) {
  const latencyMs = metadata.latencyMs ?? (mode === "offline" ? 18 : replayLatency(scene.id));
  return normalizePlan(scene.expected, scene.expected, {
    latencyMs,
    mode,
    serverlessStatus: mode === "offline" ? "offline" : "warm",
    source: mode === "offline" ? "bundled-offline" : "captured-replay"
  });
}

function statusPayload() {
  return {
    ok: true,
    mode: activeMode,
    endpointConfigured: Boolean(endpointUrl && endpointToken),
    endpointPath,
    requestCount: stats.requestCount,
    errorCount: stats.errorCount,
    lastLatencyMs: stats.lastLatencyMs,
    lastMode: stats.lastMode,
    lastStatus: stats.lastStatus,
    modelImage,
    gpuClass,
    shmSize,
    startedAt: stats.startedAt
  };
}

async function callNebiusEndpoint(scene, prompt) {
  if (!endpointUrl || !endpointToken) {
    throw new Error("NEBIUS_ENDPOINT_URL and NEBIUS_ENDPOINT_TOKEN are required for live mode.");
  }

  const url = new URL(endpointPath, endpointUrl.endsWith("/") ? endpointUrl : `${endpointUrl}/`);
  const payload = {
    scene_id: scene.id,
    prompt,
    image: `data:image/svg+xml;base64,${Buffer.from(scene.imageSvg).toString("base64")}`,
    image_format: "svg",
    response_schema: "robotics_plan_v1"
  };

  const started = nowMs();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${endpointToken}`,
      "Content-Type": "application/json"
    },
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
  return normalizePlan(raw, scene.expected, {
    latencyMs,
    mode: "live",
    serverlessStatus,
    source: "nebius-serverless"
  });
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "nebius-serverless-robotics-demo", mode: activeMode });
});

app.get("/api/status", (_request, response) => {
  response.json(statusPayload());
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
      plan = makeReplayResponse(scene, activeMode);
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
      const plan = makeReplayResponse(scene, "replay", { latencyMs: replayLatency(scene.id) });
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
        warning: error instanceof Error ? error.message : String(error),
        status: statusPayload()
      });
      return;
    }

    response.status(502).json({ error: error instanceof Error ? error.message : String(error), status: statusPayload() });
  }
});

app.use(express.static(distDir));
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Nebius Serverless Robotics Demo backend listening on http://127.0.0.1:${port}`);
});
