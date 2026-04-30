import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function waitForHealth(baseUrl, processOutput) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const { response, payload } = await fetchJson(`${baseUrl}/api/health`);
      if (response.ok && payload.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`server did not become healthy\n${processOutput()}`);
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SERVER_PORT: String(port),
      DEMO_MODE: "offline",
      NEBIUS_ENDPOINT_URL: "",
      NEBIUS_ENDPOINT_TOKEN: "",
      ALLOW_FALLBACK_ON_ERROR: "true"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForHealth(baseUrl, () => output);

    const indexResponse = await fetch(`${baseUrl}/`);
    assert(indexResponse.ok, "compiled UI did not serve index.html");

    const liveCheck = await fetchJson(`${baseUrl}/api/live-check`, { method: "POST" });
    assert(liveCheck.response.status === 400, "live check without credentials should return HTTP 400");
    assert(liveCheck.payload.missing.includes("NEBIUS_ENDPOINT_URL"), "live check did not report missing endpoint URL");

    const scenes = await fetchJson(`${baseUrl}/api/scenes`);
    assert(scenes.response.ok, "scenes endpoint failed");
    assert(Array.isArray(scenes.payload.scenes), "scenes payload is missing scene list");
    assert(scenes.payload.scenes.length >= 5, "expected at least five prepared scenes");

    const offline = await fetchJson(`${baseUrl}/api/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId: "tabletop-pick-place", prompt: "Pick up the red cup." })
    });
    assert(offline.response.ok, "offline inference failed");
    assert(offline.payload.plan.serverless_status === "offline", "offline inference did not report offline status");
    assert(offline.payload.plan.objects.length > 0, "offline inference returned no objects");

    const replayMode = await fetchJson(`${baseUrl}/api/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "replay" })
    });
    assert(replayMode.response.ok, "replay mode switch failed");

    const replay = await fetchJson(`${baseUrl}/api/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId: "safety-stop", prompt: "Pick up the red cup while occupied." })
    });
    assert(replay.response.ok, "replay inference failed");
    assert(replay.payload.plan.serverless_status === "warm", "replay inference did not report warm status");

    const liveMode = await fetchJson(`${baseUrl}/api/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "live" })
    });
    assert(liveMode.response.ok, "live mode switch failed");

    const liveFallback = await fetchJson(`${baseUrl}/api/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId: "tabletop-pick-place", prompt: "Pick up the red cup." })
    });
    assert(liveFallback.response.ok, "live fallback inference failed");
    assert(liveFallback.payload.plan.serverless_status === "live-fallback", "live mode did not fall back safely without credentials");
    assert(typeof liveFallback.payload.warning === "string", "live fallback did not include a warning");

    console.log("Smoke test passed.");
  } finally {
    server.kill("SIGTERM");
    await delay(200);
    if (!server.killed) server.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
