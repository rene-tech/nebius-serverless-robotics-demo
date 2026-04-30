# Live Demo Runbook

This app is already usable in `offline` and `replay` modes. A full live demo needs one running Nebius Serverless AI endpoint that accepts either the native robotics request shape or an OpenAI-compatible VLM request and returns model output that can be normalized into the robotics schema.

## Required Values

Set these in `.env` on the backend host:

```bash
DEMO_MODE=offline
NEBIUS_ENDPOINT_URL=https://...
NEBIUS_ENDPOINT_PATH=/v1/chat/completions
NEBIUS_HEALTH_PATH=/health
NEBIUS_ENDPOINT_TOKEN=...
NEBIUS_ENDPOINT_KIND=openai-vlm
NEBIUS_VLM_MODEL=qwen2.5-vl-3b
NEBIUS_MODEL_IMAGE=vllm/vllm-openai:latest
NEBIUS_GPU_CLASS=<gpu-platform>/<gpu-preset shown to audience>
ALLOW_FALLBACK_ON_ERROR=true
RECORD_LIVE_RESPONSES=true
```

Do not put `NEBIUS_ENDPOINT_TOKEN` in the browser environment or a static hosting provider.

## Endpoint Contract

For a native robotics container, expose:

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

For a real VLM container, expose the OpenAI-compatible vLLM surface:

```text
GET  /health
POST /v1/chat/completions
```

Set `NEBIUS_ENDPOINT_KIND=openai-vlm`. The backend renders the SVG scene to PNG, sends it as `image_url` content, and asks the model to return the same robotics JSON schema.

This repository includes a deterministic demo implementation in `model-server/`. It is not a real VLM, but it exercises the same Serverless endpoint lifecycle, auth, latency, fallback, and UI path.

## Nebius CLI Shape

The installed CLI supports endpoint creation with this shape:

```bash
nebius ai endpoint create \
  --name nebius-robotics-vlm-qwen \
  --image vllm/vllm-openai:latest \
  --container-port 8000 \
  --auth token \
  --token '<event-token>' \
  --public \
  --platform gpu-l40s-d \
  --preset 1gpu-16vcpu-96gb \
  --shm-size 16Gi \
  --env HF_HUB_ENABLE_HF_TRANSFER=1 \
  --env VLLM_WORKER_MULTIPROC_METHOD=spawn \
  --args 'Qwen/Qwen2.5-VL-3B-Instruct --served-model-name qwen2.5-vl-3b --host 0.0.0.0 --port 8000 --dtype half --max-model-len 8192 --limit-mm-per-prompt '\''{"image":1}'\'''
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
