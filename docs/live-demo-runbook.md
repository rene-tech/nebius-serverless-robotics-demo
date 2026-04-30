# Live Demo Runbook

This app is already usable in `offline` and `replay` modes. A full live demo needs one running Nebius Serverless AI endpoint that accepts the backend request shape and returns model output that can be normalized into the robotics schema.

## Required Values

Set these in `.env` on the backend host:

```bash
DEMO_MODE=offline
NEBIUS_ENDPOINT_URL=https://...
NEBIUS_ENDPOINT_PATH=/v1/robotics/plan
NEBIUS_HEALTH_PATH=/health
NEBIUS_ENDPOINT_TOKEN=...
NEBIUS_MODEL_IMAGE=cr.me-west1.nebius.cloud/<registry-id>/<image>:<tag>
NEBIUS_GPU_CLASS=<platform>/<preset shown to audience>
ALLOW_FALLBACK_ON_ERROR=true
RECORD_LIVE_RESPONSES=true
```

Do not put `NEBIUS_ENDPOINT_TOKEN` in the browser environment or a static hosting provider.

## Endpoint Contract

The robotics container should expose:

```text
GET  /health
POST /v1/robotics/plan
```

The backend sends:

```json
{
  "scene_id": "tabletop-pick-place",
  "prompt": "Pick up the red cup...",
  "image": "data:image/svg+xml;base64,...",
  "image_format": "svg",
  "response_schema": "robotics_plan_v1"
}
```

The ideal response is:

```json
{
  "objects": [{ "name": "red cup", "bbox": [143, 164, 207, 276], "confidence": 0.94 }],
  "selected_object": "red cup",
  "action_steps": ["Move the gripper above the red cup."],
  "trajectory": [{ "x": 175, "y": 140 }],
  "safety_notes": ["Keep clearance over the plate."],
  "confidence": 0.89
}
```

The backend also accepts OpenAI-style responses where JSON is in `choices[0].message.content`.

This repository includes a deterministic demo implementation in `model-server/`. It is not a real VLM, but it exercises the same Serverless endpoint lifecycle, auth, latency, fallback, and UI path while the final robotics model image is being selected.

## Nebius CLI Shape

The installed CLI supports endpoint creation with this shape:

```bash
nebius ai endpoint create \
  --name nebius-serverless-robotics-demo \
  --image cr.me-west1.nebius.cloud/<registry-id>/<image>:<tag> \
  --container-port 8000 \
  --auth token \
  --token '<event-token>' \
  --public \
  --platform <gpu-platform> \
  --preset <gpu-preset> \
  --shm-size 16Gi \
  --env DEMO_RUNTIME=serverless-robotics
```

Creating endpoints can incur cost. Confirm image, platform, preset, and token strategy before running the command.

## Rehearsal

```bash
npm install
npm run test
npm run validate:live
RECORD_LIVE_RESPONSES=true npm start
```

Then open the app, switch to `live`, and run each prepared scene once. The backend writes local live captures to `server/replay-recordings.jsonl`; those captures are intentionally ignored by git.

For the event, keep `ALLOW_FALLBACK_ON_ERROR=true`. If the live endpoint fails, the audience UI receives a replay response with a clear internal warning while the visual flow continues.

## Hosted Web Page

Preferred public setup for the event:

```text
https://robotics-demo.<domain>
  -> app container serving React UI and Express backend on the same origin
  -> Nebius Serverless AI endpoint
```

Same-origin hosting avoids exposing the endpoint token and avoids CORS complexity. If the UI must be hosted as static files separately, set `VITE_API_BASE_URL` at build time to the backend URL and set `CORS_ORIGIN` on the backend to the public UI origin.

## Final Pre-Event Checklist

- Endpoint `GET /health` returns success through `npm run validate:live`.
- Endpoint `POST /v1/robotics/plan` returns usable output through `npm run validate:live`.
- App `Check live` button succeeds.
- All prepared scenes have been run in live mode at least once.
- Replay file exists locally for fallback rehearsal.
- Backend host has no secrets in logs, browser HTML, or frontend env.
- DNS points to the app/backend host, not directly to the Nebius endpoint.
- Cleanup command for the Nebius endpoint is documented for the specific endpoint ID.
