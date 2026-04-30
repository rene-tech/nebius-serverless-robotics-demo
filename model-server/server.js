import http from "node:http";

const port = Number(process.env.PORT ?? 8000);
const startedAt = new Date();

const plans = {
  "tabletop-pick-place": {
    objects: [
      { name: "red cup", bbox: [143, 164, 207, 276], confidence: 0.94 },
      { name: "plate", bbox: [268, 233, 376, 292], confidence: 0.91 },
      { name: "blue block", bbox: [238, 204, 296, 262], confidence: 0.88 },
      { name: "target area", bbox: [448, 213, 522, 283], confidence: 0.9 }
    ],
    selected_object: "red cup",
    action_steps: [
      "Move the gripper above the red cup.",
      "Descend vertically until the gripper reaches the cup rim.",
      "Close the gripper with a light grasp.",
      "Lift the cup above the plate height.",
      "Move to the marked target area and release."
    ],
    trajectory: [
      { x: 175, y: 140 },
      { x: 176, y: 224 },
      { x: 220, y: 150 },
      { x: 365, y: 156 },
      { x: 486, y: 236 }
    ],
    safety_notes: ["Keep clearance over the plate.", "Use a slow release inside the marked target area."],
    confidence: 0.89
  },
  "warehouse-bin-pick": {
    objects: [
      { name: "yellow package", bbox: [166, 195, 258, 251], confidence: 0.92 },
      { name: "green ball", bbox: [300, 186, 380, 266], confidence: 0.89 },
      { name: "purple parcel", bbox: [376, 180, 486, 285], confidence: 0.86 },
      { name: "red tool", bbox: [214, 259, 296, 294], confidence: 0.83 }
    ],
    selected_object: "yellow package",
    action_steps: [
      "Move to the center of the yellow package.",
      "Approach from above to avoid pushing nearby objects.",
      "Grip across the narrow side of the package.",
      "Lift straight up until the object clears the tote rim."
    ],
    trajectory: [
      { x: 212, y: 150 },
      { x: 212, y: 224 },
      { x: 212, y: 132 },
      { x: 128, y: 104 }
    ],
    safety_notes: ["Avoid side contact with the green ball.", "Keep the package level while lifting."],
    confidence: 0.86
  },
  "color-sorting": {
    objects: [
      { name: "red circle", bbox: [131, 323, 177, 369], confidence: 0.95 },
      { name: "blue square", bbox: [299, 326, 347, 374], confidence: 0.93 },
      { name: "green triangle", bbox: [441, 323, 511, 384], confidence: 0.92 },
      { name: "red bin", bbox: [92, 171, 200, 289], confidence: 0.9 },
      { name: "blue bin", bbox: [266, 171, 374, 289], confidence: 0.9 },
      { name: "green bin", bbox: [440, 171, 548, 289], confidence: 0.9 }
    ],
    selected_object: "red circle, blue square, green triangle",
    action_steps: [
      "Move the red circle into the red bin.",
      "Move the blue square into the blue bin.",
      "Move the green triangle into the green bin.",
      "Verify each piece is fully inside its matching bin."
    ],
    trajectory: [
      { x: 154, y: 346 },
      { x: 146, y: 230 },
      { x: 323, y: 350 },
      { x: 320, y: 230 },
      { x: 476, y: 352 },
      { x: 494, y: 230 }
    ],
    safety_notes: ["Use one item per grasp.", "Keep the arm above bin walls during lateral moves."],
    confidence: 0.88
  },
  "fragile-avoidance": {
    objects: [
      { name: "red cup", bbox: [147, 197, 219, 275], confidence: 0.93 },
      { name: "fragile glass", bbox: [296, 162, 360, 292], confidence: 0.9 },
      { name: "blue box", bbox: [402, 206, 484, 264], confidence: 0.86 }
    ],
    selected_object: "red cup",
    action_steps: [
      "Approach the red cup from the left side.",
      "Lift the cup before any lateral movement.",
      "Route around the fragile glass instead of passing over it.",
      "Place the cup in the open area with low speed."
    ],
    trajectory: [
      { x: 183, y: 172 },
      { x: 183, y: 236 },
      { x: 182, y: 128 },
      { x: 248, y: 118 },
      { x: 454, y: 288 }
    ],
    safety_notes: ["Never pass the payload over the glass.", "Keep the fragile zone outside the swept path."],
    confidence: 0.84
  },
  "navigation-obstacle": {
    objects: [
      { name: "blue start marker", bbox: [120, 251, 188, 319], confidence: 0.95 },
      { name: "orange obstacle", bbox: [286, 207, 378, 277], confidence: 0.93 },
      { name: "green dock", bbox: [432, 144, 506, 218], confidence: 0.92 }
    ],
    selected_object: "green dock",
    action_steps: [
      "Start at the blue marker with the obstacle in view.",
      "Follow the left edge of the free corridor.",
      "Curve around the obstacle with a safety margin.",
      "Approach the green dock from the lower-left side."
    ],
    trajectory: [
      { x: 154, y: 285 },
      { x: 222, y: 236 },
      { x: 284, y: 166 },
      { x: 391, y: 168 },
      { x: 469, y: 181 }
    ],
    safety_notes: ["Maintain clearance from the obstacle.", "Slow down during the final dock approach."],
    confidence: 0.87
  },
  "ambiguous-cups": {
    objects: [
      { name: "left red cup", bbox: [145, 194, 207, 286], confidence: 0.91 },
      { name: "right red cup", bbox: [247, 194, 309, 286], confidence: 0.91 },
      { name: "safe area", bbox: [410, 191, 496, 270], confidence: 0.9 }
    ],
    selected_object: "left red cup",
    action_steps: [
      "Identify two candidate red cups.",
      "Choose the left cup because it has a clearer approach path.",
      "Pick the left cup from above.",
      "Move it to the safe area and release."
    ],
    trajectory: [
      { x: 176, y: 164 },
      { x: 176, y: 240 },
      { x: 230, y: 150 },
      { x: 356, y: 156 },
      { x: 453, y: 231 }
    ],
    safety_notes: ["Instruction is ambiguous because there are two red cups.", "Presenter can ask a follow-up or accept the safer default."],
    confidence: 0.72
  },
  "safety-stop": {
    objects: [
      { name: "red cup", bbox: [132, 183, 210, 269], confidence: 0.92 },
      { name: "human hand", bbox: [305, 220, 540, 304], confidence: 0.94 },
      { name: "blue block", bbox: [248, 185, 300, 237], confidence: 0.86 }
    ],
    selected_object: "none",
    action_steps: [
      "Stop motion because a human hand is inside the active workspace.",
      "Keep the gripper open and hold position.",
      "Wait until the workspace is clear.",
      "Re-evaluate the scene before attempting a grasp."
    ],
    trajectory: [
      { x: 170, y: 146 },
      { x: 170, y: 146 }
    ],
    safety_notes: ["Do not move while a human hand is present.", "Require operator confirmation before retrying."],
    confidence: 0.96
  }
};

function json(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        request.destroy(new Error("request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function choosePlan(payload) {
  const prompt = String(payload.prompt ?? payload.messages?.at?.(-1)?.content ?? "").toLowerCase();
  const requestedScene = String(payload.scene_id ?? payload.sceneId ?? "");

  if (plans[requestedScene]) return plans[requestedScene];
  if (prompt.includes("hand") || prompt.includes("occupied") || prompt.includes("stop")) return plans["safety-stop"];
  if (prompt.includes("fragile") || prompt.includes("glass")) return plans["fragile-avoidance"];
  if (prompt.includes("bin") || prompt.includes("package") || prompt.includes("warehouse")) return plans["warehouse-bin-pick"];
  if (prompt.includes("sort") || prompt.includes("blue") || prompt.includes("green")) return plans["color-sorting"];
  if (prompt.includes("dock") || prompt.includes("obstacle") || prompt.includes("path")) return plans["navigation-obstacle"];
  if (prompt.includes("ambiguous") || prompt.includes("two") || prompt.includes("safe area")) return plans["ambiguous-cups"];
  return plans["tabletop-pick-place"];
}

function withMetadata(plan, payload, latencyMs) {
  return {
    ...plan,
    latency_ms: latencyMs,
    serverless_status: "warm",
    model_metadata: {
      model: "deterministic-robot-brain-demo",
      runtime: "node-http",
      scene_id: payload.scene_id ?? payload.sceneId ?? "inferred-from-prompt",
      prompt_chars: String(payload.prompt ?? "").length,
      uptime_s: Math.round((Date.now() - startedAt.getTime()) / 1000)
    }
  };
}

const server = http.createServer(async (request, response) => {
  const requestStarted = Date.now();

  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, {
      ok: true,
      service: "nebius-robotics-demo-model",
      uptime_s: Math.round((Date.now() - startedAt.getTime()) / 1000)
    });
    return;
  }

  if (request.method === "POST" && request.url === "/v1/robotics/plan") {
    try {
      const payload = await readBody(request);
      const plan = choosePlan(payload);
      json(response, 200, withMetadata(plan, payload, Date.now() - requestStarted));
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/v1/chat/completions") {
    try {
      const payload = await readBody(request);
      const plan = withMetadata(choosePlan(payload), payload, Date.now() - requestStarted);
      json(response, 200, {
        id: `robotics-demo-${Date.now()}`,
        object: "chat.completion",
        model: "deterministic-robot-brain-demo",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify(plan)
            },
            finish_reason: "stop"
          }
        ]
      });
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  json(response, 404, { error: "not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Nebius robotics demo model listening on 0.0.0.0:${port}`);
});
