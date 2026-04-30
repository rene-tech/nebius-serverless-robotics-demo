export type DemoMode = "live" | "replay" | "offline";

export type SceneSummary = {
  id: string;
  title: string;
  task: string;
  prompt: string;
  imageSvg: string;
  presenterNotes: string;
};

export type DetectedObject = {
  name: string;
  bbox: [number, number, number, number];
  confidence: number;
};

export type TrajectoryPoint = {
  x: number;
  y: number;
};

export type RoboticsPlan = {
  objects: DetectedObject[];
  selected_object: string;
  action_steps: string[];
  trajectory: TrajectoryPoint[];
  safety_notes: string[];
  confidence: number;
  latency_ms: number;
  serverless_status: string;
  mode: DemoMode | string;
  source: string;
};

export type StatusPayload = {
  ok: boolean;
  mode: DemoMode;
  endpointConfigured: boolean;
  endpointPath: string;
  requestCount: number;
  errorCount: number;
  lastLatencyMs: number | null;
  lastMode: string;
  lastStatus: string;
  modelImage: string;
  gpuClass: string;
  shmSize: string;
  startedAt: string;
};

export type InferenceResponse = {
  sceneId: string;
  prompt: string;
  plan: RoboticsPlan;
  warning?: string;
  status: StatusPayload;
};
