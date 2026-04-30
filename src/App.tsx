import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Cpu,
  Gauge,
  ListChecks,
  LockKeyhole,
  Play,
  Radio,
  RefreshCw,
  Route,
  Server,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DemoMode, InferenceResponse, RoboticsPlan, SceneSummary, StatusPayload } from "./types";

const modes: DemoMode[] = ["offline", "replay", "live"];

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function statusTone(status: string) {
  if (status.includes("fallback") || status.includes("cold")) return "warn";
  if (status === "offline") return "neutral";
  return "good";
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <Icon size={17} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SceneOverlay({ plan }: { plan?: RoboticsPlan }) {
  if (!plan) return null;

  const path = plan.trajectory.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <svg className="scene-overlay" viewBox="0 0 640 420" aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f766e" />
        </marker>
      </defs>

      {plan.objects.map((object) => {
        const [x1, y1, x2, y2] = object.bbox;
        const isSelected = plan.selected_object !== "none" && object.name.toLowerCase().includes(plan.selected_object.toLowerCase().split(",")[0]);
        return (
          <g key={`${object.name}-${x1}-${y1}`}>
            <rect
              x={x1}
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              rx="8"
              className={isSelected ? "overlay-box selected" : "overlay-box"}
            />
            <foreignObject x={x1} y={Math.max(0, y1 - 30)} width="190" height="28">
              <div className={isSelected ? "overlay-label selected" : "overlay-label"}>
                {object.name} {percent(object.confidence)}
              </div>
            </foreignObject>
          </g>
        );
      })}

      {path && (
        <g>
          <path d={path} className="trajectory-line" markerEnd="url(#arrow)" />
          {plan.trajectory.map((point, index) => (
            <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r={index === 0 ? 7 : 5} className="trajectory-point" />
          ))}
        </g>
      )}
    </svg>
  );
}

function ActionTimeline({ plan }: { plan?: RoboticsPlan }) {
  if (!plan) {
    return (
      <div className="empty-state">
        <ListChecks size={22} aria-hidden="true" />
        <span>Run inference to generate a robot plan.</span>
      </div>
    );
  }

  return (
    <ol className="timeline">
      {plan.action_steps.map((step, index) => (
        <li key={`${index}-${step}`}>
          <span>{index + 1}</span>
          <p>{step}</p>
        </li>
      ))}
    </ol>
  );
}

function ObjectList({ plan }: { plan?: RoboticsPlan }) {
  if (!plan) return <p className="muted compact">Detected objects will appear after a request.</p>;

  return (
    <div className="object-list">
      {plan.objects.map((object) => (
        <div className="object-row" key={`${object.name}-${object.bbox.join("-")}`}>
          <Box size={16} aria-hidden="true" />
          <span>{object.name}</span>
          <strong>{percent(object.confidence)}</strong>
        </div>
      ))}
    </div>
  );
}

function SafetyPanel({ plan, warning }: { plan?: RoboticsPlan; warning?: string }) {
  if (!plan) return <p className="muted compact">Safety checks are part of the normalized robotics schema.</p>;

  return (
    <div className="safety-list">
      {warning && (
        <div className="safety-note warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{warning}</span>
        </div>
      )}
      {plan.safety_notes.map((note) => (
        <div className="safety-note" key={note}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}

function ModeControl({
  mode,
  onChange,
  disabled
}: {
  mode: DemoMode;
  onChange: (mode: DemoMode) => void;
  disabled: boolean;
}) {
  return (
    <div className="mode-control" aria-label="Presenter mode control">
      {modes.map((item) => (
        <button
          key={item}
          type="button"
          className={mode === item ? "active" : ""}
          disabled={disabled}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [result, setResult] = useState<InferenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId]
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [scenesResponse, statusResponse] = await Promise.all([fetch("/api/scenes"), fetch("/api/status")]);
        const scenesPayload = (await scenesResponse.json()) as { scenes: SceneSummary[] };
        const statusPayload = (await statusResponse.json()) as StatusPayload;
        if (ignore) return;
        setScenes(scenesPayload.scenes);
        setSelectedSceneId(scenesPayload.scenes[0]?.id ?? "");
        setPrompt(scenesPayload.scenes[0]?.prompt ?? "");
        setStatus(statusPayload);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function chooseScene(scene: SceneSummary) {
    setSelectedSceneId(scene.id);
    setPrompt(scene.prompt);
    setResult(null);
    setError("");
  }

  async function updateMode(mode: DemoMode) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      if (!response.ok) throw new Error(await response.text());
      setStatus((await response.json()) as StatusPayload);
    } catch (modeError) {
      setError(modeError instanceof Error ? modeError.message : String(modeError));
    } finally {
      setLoading(false);
    }
  }

  async function runInference() {
    if (!selectedScene) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId: selectedScene.id, prompt })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as InferenceResponse;
      setResult(payload);
      setStatus(payload.status);
    } catch (inferError) {
      setError(inferError instanceof Error ? inferError.message : String(inferError));
    } finally {
      setLoading(false);
    }
  }

  const plan = result?.plan;
  const currentMode = status?.mode ?? "offline";
  const serverlessStatus = plan?.serverless_status ?? status?.lastStatus ?? currentMode;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Nebius Serverless AI</p>
          <h1>Serverless Robot Brain</h1>
        </div>
        <div className="topbar-actions">
          <div className="token-pill">
            <LockKeyhole size={15} aria-hidden="true" />
            Token held by backend proxy
          </div>
          <ModeControl mode={currentMode} disabled={loading} onChange={updateMode} />
        </div>
      </header>

      <section className="metrics-strip" aria-label="Endpoint status">
        <Metric icon={Radio} label="Mode" value={currentMode} tone={currentMode === "live" ? "good" : "neutral"} />
        <Metric icon={Activity} label="Endpoint" value={serverlessStatus} tone={statusTone(serverlessStatus)} />
        <Metric icon={Gauge} label="Latency" value={plan ? `${plan.latency_ms} ms` : status?.lastLatencyMs ? `${status.lastLatencyMs} ms` : "ready"} />
        <Metric icon={Cpu} label="Resource" value={status?.gpuClass ?? "GPU-backed endpoint"} />
        <Metric icon={Server} label="Container" value={status?.modelImage ?? "Docker image configured on backend"} />
      </section>

      <section className="workspace-grid">
        <aside className="scene-rail" aria-label="Scene picker">
          <div className="section-title">
            <span>Scenes</span>
            <small>{scenes.length} prepared</small>
          </div>
          <div className="scene-list">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={scene.id === selectedScene?.id ? "scene-card active" : "scene-card"}
                onClick={() => chooseScene(scene)}
              >
                <img src={svgDataUrl(scene.imageSvg)} alt="" />
                <span>{scene.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="scene-panel" aria-label="Robotics scene">
          {selectedScene && (
            <>
              <div className="scene-header">
                <div>
                  <h2>{selectedScene.title}</h2>
                  <p>{selectedScene.task}</p>
                </div>
                {plan && (
                  <div className="confidence-chip">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {percent(plan.confidence)} confidence
                  </div>
                )}
              </div>
              <div className="scene-frame">
                <img src={svgDataUrl(selectedScene.imageSvg)} alt={selectedScene.title} />
                <SceneOverlay plan={plan} />
              </div>
            </>
          )}
        </section>

        <section className="control-panel" aria-label="Instruction and robot plan">
          <div className="prompt-panel">
            <label htmlFor="prompt">Instruction</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              spellCheck="true"
            />
            <button className="run-button" type="button" disabled={loading || !selectedScene} onClick={runInference}>
              {loading ? <RefreshCw size={18} className="spin" aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              {loading ? "Running" : "Run inference"}
            </button>
            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="panel-grid">
            <article className="info-panel wide">
              <div className="section-title">
                <span>Robot Plan</span>
                <Route size={17} aria-hidden="true" />
              </div>
              <ActionTimeline plan={plan} />
            </article>

            <article className="info-panel">
              <div className="section-title">
                <span>Objects</span>
                <Box size={17} aria-hidden="true" />
              </div>
              <ObjectList plan={plan} />
            </article>

            <article className="info-panel">
              <div className="section-title">
                <span>Safety</span>
                <ShieldCheck size={17} aria-hidden="true" />
              </div>
              <SafetyPanel plan={plan} warning={result?.warning} />
            </article>
          </div>
        </section>
      </section>

      <footer className="demo-footer">
        <span>Docker container deployed as a Nebius Serverless AI endpoint</span>
        <span>No cluster, node pool, scheduler, or manual GPU server management in the demo path</span>
        <span>Browser calls backend proxy only</span>
      </footer>
    </main>
  );
}
