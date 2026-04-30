# Nebius Serverless Robotics Demo

Standalone public demo for showing a Dockerized robotics model served through Nebius Serverless AI. This repository is intentionally independent of Forge: no Forge UI, API, branding, model catalog, or deployment assumptions.

## What It Shows

- A browser UI for robotics visual instruction following.
- A token-safe backend proxy that calls a Nebius Serverless AI endpoint.
- Deterministic offline and replay modes for stage-safe demos.
- Live mode for calling a real token-authenticated endpoint.
- Bounding boxes, selected target, robot action plan, trajectory overlay, safety notes, confidence, latency, and cold/warm status.

## Architecture

```text
Standalone React UI
   -> Express backend proxy
   -> Nebius Serverless AI endpoint
   -> Robotics model Docker container
```

The browser never receives the Nebius endpoint token. The backend normalizes model output into the robotics schema used by the UI.

## Run Locally

```bash
npm install
npm run dev
```

The app runs as:

- UI: `http://localhost:5173`
- Backend: `http://localhost:8787`

The default mode is `offline`, so the demo works without network access or endpoint credentials.

Run the full local verification suite:

```bash
npm test
```

## Live Endpoint Configuration

Copy `.env.example` to `.env` and set the backend-only values:

```bash
SERVER_PORT=8787
DEMO_MODE=offline
NEBIUS_ENDPOINT_URL=https://your-endpoint.example
NEBIUS_ENDPOINT_PATH=/v1/robotics/plan
NEBIUS_HEALTH_PATH=/health
NEBIUS_ENDPOINT_TOKEN=...
NEBIUS_MODEL_IMAGE=registry.example.com/robotics/cosmos-reason:demo
NEBIUS_GPU_CLASS=GPU-backed Serverless AI endpoint
NEBIUS_SHM_SIZE=16Gi
ALLOW_FALLBACK_ON_ERROR=true
RECORD_LIVE_RESPONSES=true
```

Use the presenter control in the UI to switch between `offline`, `replay`, and `live`.

Validate a configured live endpoint before rehearsal:

```bash
npm run validate:live
```

## Backend API

- `GET /api/health`
- `GET /api/status`
- `GET /api/scenes`
- `POST /api/mode` with `{ "mode": "offline" | "replay" | "live" }`
- `POST /api/live-check`
- `POST /api/infer` with `{ "sceneId": "...", "prompt": "..." }`

The live endpoint receives:

```json
{
  "scene_id": "tabletop-pick-place",
  "prompt": "Pick up the red cup...",
  "image": "data:image/svg+xml;base64,...",
  "image_format": "svg",
  "response_schema": "robotics_plan_v1"
}
```

The proxy returns normalized robotics JSON:

```json
{
  "objects": [{ "name": "red cup", "bbox": [143, 164, 207, 276], "confidence": 0.94 }],
  "selected_object": "red cup",
  "action_steps": ["Move the gripper above the red cup."],
  "trajectory": [{ "x": 175, "y": 140 }],
  "safety_notes": ["Keep clearance over the plate."],
  "confidence": 0.89,
  "latency_ms": 742,
  "serverless_status": "warm"
}
```

## Build

```bash
npm run build
npm start
```

After `npm run build`, the Express server serves the compiled UI from `dist/`.

## Container

```bash
docker build -t nebius-serverless-robotics-demo .
docker run --rm -p 8787:8787 --env-file .env nebius-serverless-robotics-demo
```

## Presenter Flow

1. Open the demo page in `offline` or `replay` mode.
2. Explain that the model is packaged as a Docker container behind a Nebius Serverless AI endpoint.
3. Select the tabletop pick-and-place scene and run inference.
4. Point out detected objects, the selected target, trajectory, safety notes, and latency.
5. Switch to a safety-focused scene and show the stop or avoid behavior.
6. Switch to `live` when the endpoint is configured and healthy.

## Live Demo Readiness

See [docs/live-demo-runbook.md](docs/live-demo-runbook.md) for the Nebius endpoint contract, CLI command shape, rehearsal flow, replay capture, and hosted-page guidance.

## Notes

- Keep endpoint tokens only in backend environment variables.
- Keep `ALLOW_FALLBACK_ON_ERROR=true` for live event runs.
- Replace the bundled SVG scenes with licensed public demo assets when final robotics imagery is chosen.
