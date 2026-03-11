"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";


type FlightType = "INBOUND" | "OUTBOUND";
type EmergencyStatus =
  | "NONE"
  | "FUEL"
  | "MECHANICAL_FAILURE"
  | "PASSENGER_HEALTH";
type AircraftState =
  | "ENTERING_SIM"
  | "HOLDING"
  | "TAKEOFF_QUEUE"
  | "RUNWAY"
  | "EXITED"
  | "CANCELLED"
  | "DIVERTED";

type RunwayMode = "LANDING" | "TAKEOFF" | "MIXED";
type RunwayStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RUNWAY_INSPECTION"
  | "SNOW_CLEARANCE"
  | "EQUIPMENT_FAILURE";

type AircraftRow = {
  aircraftID: string;
  type: FlightType;
  state: AircraftState;
  emergencyStatus: EmergencyStatus;
  fuelRemainingMins: number;
  waitSeconds: number;
};

type RunwayRow = {
  runwayNumber: string;
  mode: RunwayMode;
  status: RunwayStatus;
  occupiedBy: string | null;
  currentAction: "Landing" | "Take-off" | "--";
  timeRemainingSeconds: number | null;
  planePosPct: number | null;
};

type LogEntry = {
  at: string;
  message: string;
};

type SimulationState = {
  scenarioName: string;
  seed: number | null;
  runIndex: number;
  runCountTotal: number;
  elapsedSeconds: number;
  runways: RunwayRow[];
  holding: AircraftRow[];
  takeoff: AircraftRow[];
  log: LogEntry[];
};

type SimulationConfig = {
  inboundFlowRate: number;
  outboundFlowRate: number;
  durationMinutes: number;
  runCount?: number;
  seed?: number | null;
  runways: { id: string; mode: RunwayMode; status: RunwayStatus }[];
};

type SimulateResponse = {
  status: "success" | string;
  configurationUsed: SimulationConfig;
  perRunResults: any[];
  aggregatedResults: any;
};

type LiveStartResponse = {
  status: string;
  simId: string;
  finished: boolean;
  snapshot: SimulationState;
};

type LiveTickResponse = {
  status: string;
  simId: string;
  finished: boolean;
  snapshot: SimulationState;
  configurationUsed?: SimulationConfig;
  perRunResults?: any[];
  aggregatedResults?: any;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const fmtMMSS = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${pad2(s)}`;
};

const fmtHHMM = (totalSeconds: number) => {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}:${pad2(mins)}`;
};

const emergencyLabel = (e: EmergencyStatus) => {
  switch (e) {
    case "NONE":
      return "--";
    case "FUEL":
      return "Fuel";
    case "MECHANICAL_FAILURE":
      return "Mechanical failure";
    case "PASSENGER_HEALTH":
      return "Passenger health";
    default:
      return "--";
  }
};

const statusLabel = (s: RunwayStatus) => {
  switch (s) {
    case "AVAILABLE":
      return "Available";
    case "OCCUPIED":
      return "Occupied";
    case "RUNWAY_INSPECTION":
      return "Runway inspection";
    case "SNOW_CLEARANCE":
      return "Snow clearance";
    case "EQUIPMENT_FAILURE":
      return "Equipment failure";
    default:
      return String(s);
  }
};

const modeLabel = (m: RunwayMode) => {
  switch (m) {
    case "LANDING":
      return "Landing";
    case "TAKEOFF":
      return "Take-off";
    case "MIXED":
      return "Mixed mode";
    default:
      return String(m);
  }
};

function buildDefaultRunways(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `Runway ${String(i + 1).padStart(2, "0")}`,
    mode: "MIXED" as RunwayMode,
    status: "AVAILABLE" as RunwayStatus,
  }));
}

function extractRunwayNumber(id: string) {
  const match = String(id).match(/(\d{2})$/);
  return match ? match[1] : String(id);
}

function normalizeStoredConfig(raw: any): SimulationConfig {
  const inboundFlowRate = Number(raw?.inboundFlowRate ?? raw?.inboundFlow ?? 15);
  const outboundFlowRate = Number(raw?.outboundFlowRate ?? raw?.outboundFlow ?? 15);
  const durationMinutes = Number(raw?.durationMinutes ?? 60);
  const runCount = Number(raw?.runCount ?? raw?.numRuns ?? 1);
  const seed = raw?.seed ?? null;

  let runways: { id: string; mode: RunwayMode; status: RunwayStatus }[] = [];

  if (Array.isArray(raw?.runways)) {
    runways = raw.runways.map((r: any, index: number) => ({
      id: String(r?.id ?? `Runway ${String(index + 1).padStart(2, "0")}`),
      mode: (r?.mode ?? "MIXED") as RunwayMode,
      status: (r?.status ?? "AVAILABLE") as RunwayStatus,
    }));
  } else {
    const runwayCount = Number(raw?.runways ?? raw?.runwayCount ?? 3);
    runways = buildDefaultRunways(Math.max(1, runwayCount));
  }

  return {
    inboundFlowRate,
    outboundFlowRate,
    durationMinutes,
    runCount,
    seed,
    runways,
  };
}

function loadConfigFromStorage(): SimulationConfig | null {
  if (typeof window === "undefined") return null;

  const keys = ["pp:simConfig", "pp_sim_config", "simulationConfig"];
  for (const k of keys) {
    const raw = sessionStorage.getItem(k) ?? localStorage.getItem(k);
    if (!raw) continue;

    try {
      return normalizeStoredConfig(JSON.parse(raw));
    } catch {
      // ignore invalid JSON
    }
  }

  return null;
}

function buildFallbackConfig(): SimulationConfig {
  return {
    inboundFlowRate: 15,
    outboundFlowRate: 15,
    durationMinutes: 60,
    runCount: 3,
    seed: null,
    runways: buildDefaultRunways(3),
  };
}

function deriveVisualRunwaysFromConfig(config: SimulationConfig): RunwayRow[] {
  return (config.runways ?? []).map((r) => ({
    runwayNumber: extractRunwayNumber(r.id),
    mode: r.mode,
    status: r.status,
    occupiedBy: null,
    currentAction: "--",
    timeRemainingSeconds: null,
    planePosPct: null,
  }));
}

function RunwayPlaneSprite({
  action,
  leftPct,
  paused,
  transitionSeconds,
  callsign,
}: {
  action: "Landing" | "Take-off" | "--";
  leftPct: number;
  paused: boolean;
  transitionSeconds: number;
  callsign: string | null;
}) {
  const isLanding = action === "Landing";
  const color = isLanding ? "#0f766e" : "#1d4ed8";
  const label = isLanding ? "LAND" : "T/O";

  return (
    <div
      title={callsign ? `Aircraft ${callsign}` : "Aircraft"}
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: -12,
        transform: "translateX(-50%)",
        transition: paused ? "none" : `left ${transitionSeconds}s linear`,
        willChange: "left",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {callsign && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#111827",
            background: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: 999,
            padding: "1px 6px",
            lineHeight: 1.3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            whiteSpace: "nowrap",
          }}
        >
          {callsign}
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#fff",
          background: color,
          borderRadius: 999,
          padding: "1px 6px",
          lineHeight: 1.3,
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          transform: isLanding ? "rotate(180deg)" : "rotate(0deg)",
          transition: paused ? "none" : `transform ${transitionSeconds}s linear`,
          lineHeight: 0,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2 13h7.8l3.1 8h2l-1.8-8H22v-2h-8.9L14.9 3h-2l-3.1 8H2z"
            fill={color}
          />
        </svg>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const [sim, setSim] = useState<SimulationState>({
    scenarioName: "Configured Scenario",
    seed: null,
    runIndex: 1,
    runCountTotal: 1,
    elapsedSeconds: 0,
    runways: [],
    holding: [],
    takeoff: [],
    log: [],
  });

  const [showVisual, setShowVisual] = useState(true);
  const [phase, setPhase] = useState<"idle" | "running" | "finished" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [liveSimId, setLiveSimId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const tickDelayMs = Math.max(125, Math.floor(1000 / speedMultiplier));
  const planeTransitionSeconds = Math.max(0.12, tickDelayMs / 1000 * 0.9);

  const [draftRunways, setDraftRunways] = useState<
    Record<string, { mode: RunwayMode; status: RunwayStatus }>
  >({});

  const configRef = useRef<SimulationConfig | null>(null);
  const tickInFlightRef = useRef(false);

  useEffect(() => {
    const cfg = loadConfigFromStorage() ?? buildFallbackConfig();
    configRef.current = cfg;

    const runways = deriveVisualRunwaysFromConfig(cfg);

    setSim((prev) => ({
      ...prev,
      scenarioName: "Configured Scenario",
      runCountTotal: cfg.runCount ?? 1,
      seed: cfg.seed ?? null,
      runways,
    }));

    const map: Record<string, { mode: RunwayMode; status: RunwayStatus }> = {};
    for (const r of runways) {
      map[r.runwayNumber] = { mode: r.mode, status: r.status };
    }
    setDraftRunways(map);
  }, []);

  useEffect(() => {
    setDraftRunways((prev) => {
      const next = { ...prev };
      for (const r of sim.runways) {
        if (!next[r.runwayNumber]) {
          next[r.runwayNumber] = { mode: r.mode, status: r.status };
        }
      }
      return next;
    });
  }, [sim.runways]);

  const totalDurationMinutes = configRef.current?.durationMinutes ?? 60;

  const progressPct = useMemo(() => {
    const runFraction = Math.min(
      1,
      sim.elapsedSeconds / Math.max(1, totalDurationMinutes * 60)
    );
    const overallFraction =
      ((sim.runIndex - 1) + runFraction) / Math.max(1, sim.runCountTotal);

    return Math.min(100, Math.max(0, overallFraction * 100));
  }, [sim.elapsedSeconds, sim.runIndex, sim.runCountTotal, totalDurationMinutes]);

  async function runBackendSimulation() {
    setErrorMsg(null);
    setResult(null);

    const baseConfig = configRef.current ?? buildFallbackConfig();

    const config: SimulationConfig = {
      ...baseConfig,
      runways: baseConfig.runways.map((r) => {
        const runwayNumber = extractRunwayNumber(r.id);
        const draft = draftRunways[runwayNumber];

        return {
          id: r.id,
          mode: draft?.mode ?? r.mode,
          status: draft?.status ?? r.status,
        };
      }),
    };

    if (!config.runways.length) {
      setPhase("error");
      setErrorMsg("No runways configured.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/live/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const data = (await res.json()) as LiveStartResponse;

      if ((data as any).error) {
        throw new Error((data as any).error);
      }

      setLiveSimId(data.simId);
      setSim(data.snapshot);
      setPhase("running");
      setIsPaused(false);
    } catch (err: any) {
      setPhase("error");
      setErrorMsg(err?.message ?? "Failed to start live simulation");
    }
  }

  useEffect(() => {
    if (phase !== "running" || !liveSimId || isPaused) return;

    const tickDelay = Math.max(125, Math.floor(1000 / speedMultiplier));

    const interval = window.setInterval(async () => {
      if (tickInFlightRef.current) return;
      tickInFlightRef.current = true;

      try {
        const res = await fetch(`${API_BASE}/live/${liveSimId}/tick`, {
          method: "POST",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Tick failed: ${text}`);
        }

        const data = (await res.json()) as LiveTickResponse;

        if ((data as any).error) {
          throw new Error((data as any).error);
        }

        if (data.snapshot) {
          setSim(data.snapshot);
        }

        if (data.finished) {
          const finalPayload = {
            status: "success",
            configurationUsed: data.configurationUsed,
            perRunResults: data.perRunResults ?? [],
            aggregatedResults: data.aggregatedResults ?? {},
          };

          setResult(finalPayload as SimulateResponse);
          sessionStorage.setItem("pp:lastResults", JSON.stringify(finalPayload));
          setPhase("finished");
          setIsPaused(false);

          try {
            await fetch(`${API_BASE}/save`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(finalPayload),
            });
          } catch {
            // ignore save errors
          }

          window.clearInterval(interval);
        }
      } catch (err: any) {
        setPhase("error");
        setErrorMsg(err?.message ?? "Live simulation polling failed");
        window.clearInterval(interval);
      } finally {
        tickInFlightRef.current = false;
      }
    }, tickDelay);

    return () => window.clearInterval(interval);
  }, [phase, liveSimId, API_BASE, isPaused, speedMultiplier]);

  const handleApplyChanges = async () => {
    const runwayPayload = sim.runways.map((r) => ({
      id: `Runway ${r.runwayNumber}`,
      mode: draftRunways[r.runwayNumber]?.mode ?? r.mode,
      status: draftRunways[r.runwayNumber]?.status ?? r.status,
    }));

    if (!liveSimId) {
      setSim((prev) => {
        const updated = prev.runways.map((r) => {
          const d = draftRunways[r.runwayNumber];
          if (!d) return r;

          return {
            ...r,
            mode: d.mode,
            status: d.status,
          };
        });

        return { ...prev, runways: updated };
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/live/${liveSimId}/runways`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ runways: runwayPayload }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to apply runway changes: ${text}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.snapshot) {
        setSim(data.snapshot);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to apply runway changes");
    }
  };

  async function handleFinishNow() {
    if (!liveSimId) return;

    try {
      const res = await fetch(`${API_BASE}/live/${liveSimId}/finish`, {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Finish failed: ${text}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.snapshot) {
        setSim(data.snapshot);
      }

      const finalPayload = {
        status: "success",
        configurationUsed: data.configurationUsed,
        perRunResults: data.perRunResults ?? [],
        aggregatedResults: data.aggregatedResults ?? {},
      };

      setResult(finalPayload as SimulateResponse);
      sessionStorage.setItem("pp:lastResults", JSON.stringify(finalPayload));
      setPhase("finished");
      setIsPaused(false);

      try {
        await fetch(`${API_BASE}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(finalPayload),
        });
      } catch {
        // ignore save failure
      }
    } catch (err: any) {
      setPhase("error");
      setErrorMsg(err?.message ?? "Failed to finish simulation");
    }
  }

  const pageShell: React.CSSProperties = {
    minHeight: "100vh",
    background: LIGHT_BG,
    color: TEXT,
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  };

  const card: React.CSSProperties = {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: 14,
  };

  const sectionTitle: React.CSSProperties = {
    margin: "0 0 10px",
    fontSize: 16,
    fontWeight: 800,
  };

  const smallLabel: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };

  const buttonPrimary: React.CSSProperties = {
    padding: "10px 14px",
    cursor: "pointer",
    border: "none",
    borderRadius: 8,
    background: DS_BLUE,
    color: "#fff",
    fontWeight: 800,
  };

  const buttonGhost: React.CSSProperties = {
    padding: "10px 14px",
    cursor: "pointer",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    background: "#fff",
    color: TEXT,
    fontWeight: 800,
  };

  const speedButtonStyle = (value: number): React.CSSProperties => ({
    padding: "8px 12px",
    cursor: "pointer",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    background: speedMultiplier === value ? DS_BLUE : "#fff",
    color: speedMultiplier === value ? "#fff" : TEXT,
    fontWeight: 700,
  });

  const holdingShort = sim.holding.map((a) => a.aircraftID).slice(0, 6);
  const takeoffShort = sim.takeoff.map((a) => a.aircraftID).slice(0, 6);

  return (
    <div style={pageShell}>
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={card}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                color: DS_BLUE,
              }}
            >
              Running Simulation…
            </h1>

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  height: 12,
                  background: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    background: DS_BLUE,
                    transition: "width 0.2s linear",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  style={buttonGhost}
                  onClick={() => setShowVisual((s) => !s)}
                >
                  {showVisual ? "Hide Simulation" : "Show Simulation"}
                </button>

                <div style={{ fontSize: 14, color: "#374151" }}>
                  Run: <b>{sim.runIndex}/{sim.runCountTotal}</b>
                </div>

                <div style={{ fontSize: 14, color: "#374151" }}>
                  Elapsed: <b>{fmtHHMM(sim.elapsedSeconds)}</b>
                </div>

                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {phase === "idle" || phase === "finished" || phase === "error" ? (
                    <button style={buttonPrimary} onClick={runBackendSimulation}>
                      Start
                    </button>
                  ) : (
                    <>
                      <button
                        style={buttonGhost}
                        onClick={() => setIsPaused((p) => !p)}
                      >
                        {isPaused ? "Resume" : "Pause"}
                      </button>
                      <button style={buttonPrimary} onClick={handleFinishNow}>
                        Finish Now
                      </button>
                    </>
                  )}

                  {phase === "finished" && (
                    <button
                      style={buttonPrimary}
                      onClick={() => {
                        router.push("/results");
                      }}
                    >
                      View Results
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13, color: "#6b7280" }}>Speed:</span>
                {[1, 2, 4, 8].map((speed) => (
                  <button
                    key={speed}
                    style={speedButtonStyle(speed)}
                    onClick={() => setSpeedMultiplier(speed)}
                    disabled={phase !== "running"}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
                Status:{" "}
                <b style={{ color: phase === "error" ? "#b91c1c" : "#111827" }}>
                  {phase === "idle" && "Ready"}
                  {phase === "running" && (isPaused ? "Paused" : "Running live")}
                  {phase === "finished" && "Finished"}
                  {phase === "error" && "Error"}
                </b>
                {errorMsg ? (
                  <span style={{ marginLeft: 8, color: "#b91c1c" }}>
                    — {errorMsg}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  {sim.scenarioName}
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#4b5563" }}>
                  Seed: <b>{sim.seed ?? "--"}</b>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#4b5563" }}>
                  Duration per run: <b>{totalDurationMinutes / 60} hour(s)</b>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, color: "#4b5563" }}>
                  Simulation time
                </div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {fmtHHMM(sim.elapsedSeconds)}
                </div>
              </div>
            </div>

            {result && (
              <div
                style={{
                  marginTop: 12,
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 12,
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  Backend results ready
                </div>
                <div>
                  Runs: <b>{result.perRunResults?.length ?? 0}</b>
                </div>
                <div>
                  Keys: <b>{Object.keys(result.aggregatedResults ?? {}).length}</b>
                </div>
              </div>
            )}
          </div>
        </div>

        {showVisual && (
          <section style={{ marginTop: 16, ...card }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 16,
              }}
            >
              <div>
                <div style={{ ...smallLabel, marginBottom: 8 }}>Runways</div>

                <div style={{ display: "grid", gap: 30 }}>
                  {sim.runways.map((r) => {
                    const displayedLeft =
                      r.planePosPct == null
                        ? null
                        : r.currentAction === "Landing"
                        ? r.planePosPct
                        : 100 - r.planePosPct;

                    return (
                      <div
                        key={r.runwayNumber}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#374151" }}>
                          Runway {r.runwayNumber}
                        </div>

                        <div
                          style={{
                            position: "relative",
                            height: 82,
                            overflow: "visible",
                          }}
                        >
                          {(() => {
                            const runwayLineY = 46;

                            return (
                              <>
                                {/* direction labels */}
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#0f766e",
                                  }}
                                >
                                  Landing →
                                </div>

                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#1d4ed8",
                                  }}
                                >
                                  ← Take-off
                                </div>

                                {/* runway */}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: runwayLineY,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    background: "#111827",
                                    transform: "translateY(-50%)",
                                    borderRadius: 2,
                                    zIndex: 1,
                                  }}
                                />

                                {/* threshold markers */}
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: runwayLineY,
                                    width: 3,
                                    height: 18,
                                    background: "#111827",
                                    transform: "translateY(-50%)",
                                    zIndex: 1,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: runwayLineY,
                                    width: 3,
                                    height: 18,
                                    background: "#111827",
                                    transform: "translateY(-50%)",
                                    zIndex: 1,
                                  }}
                                />

                                {/* runway guide */}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: runwayLineY,
                                    left: "8%",
                                    right: "8%",
                                    height: 0,
                                    borderTop: "1px dashed rgba(255,255,255,0.45)",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                    zIndex: 1,
                                  }}
                                />

                                {/* plane */}
                                {displayedLeft != null && r.currentAction !== "--" && (
                                  <RunwayPlaneSprite
                                    key={`${r.runwayNumber}-${r.occupiedBy ?? "idle"}-${r.currentAction}`}
                                    action={r.currentAction}
                                    leftPct={displayedLeft}
                                    paused={isPaused}
                                    transitionSeconds={planeTransitionSeconds}
                                    callsign={r.occupiedBy}
                                  />
                                )}

                                {/* current action pill */}
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: runwayLineY + 14,
                                    transform: "translateX(-50%)",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color:
                                      r.currentAction === "Landing"
                                        ? "#0f766e"
                                        : r.currentAction === "Take-off"
                                        ? "#1d4ed8"
                                        : "#6b7280",
                                    background: "#fff",
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    border: `1px solid ${BORDER}`,
                                    minWidth: 84,
                                    textAlign: "center",
                                    zIndex: 2,
                                  }}
                                >
                                  {r.currentAction === "--" ? "Idle" : r.currentAction}
                                </div>

                                {/* mode / status label aligned with runway */}
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: runwayLineY + 10,
                                    fontSize: 12,
                                    color: "#6b7280",
                                    background: "#fff",
                                    padding: "1px 4px",
                                    zIndex: 2,
                                  }}
                                >
                                  {modeLabel(r.mode)} · {statusLabel(r.status)}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: PANEL_BG,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    Holding Pattern
                  </div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    {holdingShort.length
                      ? holdingShort.map((c) => `↠ ${c}`).join(", ")
                      : "--"}
                  </div>
                </div>

                <div
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: PANEL_BG,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    Take-off Queue
                  </div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    {takeoffShort.length
                      ? takeoffShort.map((c) => `↠ ${c}`).join(", ")
                      : "--"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <h2 style={sectionTitle}>Holding Pattern</h2>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {sim.holding.length} aircraft
              </div>
            </div>

            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: `1px solid ${BORDER}`,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Aircraft
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Callsign
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Emergency
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Emergency type
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Fuel
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sim.holding.map((a) => (
                    <tr key={a.aircraftID}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        Aircraft {a.aircraftID}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                          fontWeight: 900,
                        }}
                      >
                        {a.aircraftID}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        {a.emergencyStatus === "NONE" ? "F" : "T"}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        {emergencyLabel(a.emergencyStatus)}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        {Math.round(a.fuelRemainingMins)}min
                      </td>
                    </tr>
                  ))}

                  {sim.holding.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: 12,
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        No inbound aircraft currently holding.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <h2 style={sectionTitle}>Take-off Queue</h2>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {sim.takeoff.length} aircraft
              </div>
            </div>

            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: `1px solid ${BORDER}`,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Aircraft
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Callsign
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: 10,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      Wait time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sim.takeoff.map((a) => (
                    <tr key={a.aircraftID}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        Aircraft {a.aircraftID}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                          fontWeight: 900,
                        }}
                      >
                        {a.aircraftID}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        {fmtMMSS(a.waitSeconds)}
                      </td>
                    </tr>
                  ))}

                  {sim.takeoff.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: 12,
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        No outbound aircraft currently queued.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 16, ...card }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={sectionTitle}>Runway Occupancy</h2>
            <button style={buttonPrimary} onClick={handleApplyChanges}>
              Apply Changes
            </button>
          </div>

          <div style={{ overflowX: "auto", border: `1px solid ${BORDER}` }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 900,
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "left",
                    }}
                  >
                    Runway
                  </th>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "center",
                    }}
                  >
                    Mode
                  </th>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "center",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "center",
                    }}
                  >
                    Aircraft Callsign
                  </th>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "center",
                    }}
                  >
                    Current Action
                  </th>
                  <th
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: "center",
                    }}
                  >
                    Time Remaining
                  </th>
                </tr>
              </thead>

              <tbody>
                {sim.runways.map((r) => {
                  const draft = draftRunways[r.runwayNumber] ?? {
                    mode: r.mode,
                    status: r.status,
                  };
                  const timeRem =
                    r.timeRemainingSeconds == null
                      ? "--"
                      : fmtMMSS(r.timeRemainingSeconds);

                  return (
                    <tr key={r.runwayNumber}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          fontWeight: 900,
                        }}
                      >
                        Runway {r.runwayNumber}
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        <select
                          value={draft.mode}
                          onChange={(e) =>
                            setDraftRunways((prev) => ({
                              ...prev,
                              [r.runwayNumber]: {
                                ...(prev[r.runwayNumber] ?? {
                                  mode: r.mode,
                                  status: r.status,
                                }),
                                mode: e.target.value as RunwayMode,
                              },
                            }))
                          }
                          style={{
                            width: 140,
                            padding: "6px 8px",
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                          }}
                        >
                          <option value="TAKEOFF">Take-off</option>
                          <option value="LANDING">Landing</option>
                          <option value="MIXED">Mixed mode</option>
                        </select>
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDraftRunways((prev) => ({
                              ...prev,
                              [r.runwayNumber]: {
                                ...(prev[r.runwayNumber] ?? {
                                  mode: r.mode,
                                  status: r.status,
                                }),
                                status: e.target.value as RunwayStatus,
                              },
                            }))
                          }
                          style={{
                            width: 180,
                            padding: "6px 8px",
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                          }}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="RUNWAY_INSPECTION">
                            Runway inspection
                          </option>
                          <option value="SNOW_CLEARANCE">Snow clearance</option>
                          <option value="EQUIPMENT_FAILURE">
                            Equipment failure
                          </option>
                        </select>
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                          fontWeight: 900,
                        }}
                      >
                        {r.occupiedBy ?? "--"}
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        {r.currentAction}
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: "center",
                        }}
                      >
                        {timeRem}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 16, ...card }}>
          <h2 style={{ ...sectionTitle, textAlign: "center" }}>
            Live Action Log
          </h2>

          <div
            style={{
              border: `1px solid ${BORDER}`,
              background: "#111827",
              color: "#f9fafb",
              padding: 12,
              maxHeight: 210,
              overflowY: "auto",
            }}
          >
            {sim.log.map((entry, idx) => (
              <div
                key={`${entry.at}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 900, opacity: 0.9 }}>{entry.at}</div>
                <div style={{ opacity: 0.95 }}>{entry.message}</div>
              </div>
            ))}

            {sim.log.length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.8 }}>
                No events yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}