"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

// theme constants
const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";

// ----------------- types (frontend) -----------------
type FlightType = "INBOUND" | "OUTBOUND";
type EmergencyStatus = "NONE" | "FUEL" | "MECHANICAL_FAILURE" | "PASSENGER_HEALTH";
type AircraftState =
  | "ENTERING_SIM"
  | "HOLDING"
  | "TAKEOFF_QUEUE"
  | "RUNWAY"
  | "EXITED"
  | "CANCELLED"
  | "DIVERTED";

type RunwayMode = "LANDING" | "TAKEOFF" | "MIXED";
type RunwayStatus = "AVAILABLE" | "OCCUPIED" | "RUNWAY_INSPECTION" | "SNOW_CLEARANCE" | "EQUIPMENT_FAILURE";

type AircraftRow = {
  aircraftID: string; // callsign
  type: FlightType;
  state: AircraftState;
  emergencyStatus: EmergencyStatus;
  fuelRemainingMins: number; // inbound/holding
  waitSeconds: number; // outbound/takeoff queue
};

type RunwayRow = {
  runwayNumber: string; // "01", "02", ...
  mode: RunwayMode;
  status: RunwayStatus;

  occupiedBy: string | null;
  currentAction: "Landing" | "Take-off" | "--";
  timeRemainingSeconds: number | null;

  // visual position for plane sprite (0..100)
  planePosPct: number | null;
};

type LogEntry = {
  at: string; // "01:04"
  message: string;
};

type SimulationState = {
  scenarioName: string;
  seed: number | null;
  runIndex: number; // 1-based
  runCountTotal: number;
  elapsedSeconds: number;

  runways: RunwayRow[];
  holding: AircraftRow[];
  takeoff: AircraftRow[];
  log: LogEntry[];
};

// ----------------- types (backend request/response) -----------------
type SimulationConfig = {
  inboundFlowRate: number;
  outboundFlowRate: number;
  durationMinutes: number;
  runCount?: number;
  runways: { id: string; mode: RunwayMode; status: RunwayStatus }[];
};

type SimulateResponse = {
  status: "success" | string;
  configurationUsed: SimulationConfig;
  perRunResults: any[];
  aggregatedResults: any;
};

// ----------------- helpers -----------------
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtMMSS = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${pad2(s)}`;
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

// ----------------- mock initial visual state -----------------
const initialMockState: SimulationState = {
  scenarioName: "Example Scenario",
  seed: null,
  runIndex: 1,
  runCountTotal: 3,
  elapsedSeconds: 0,
  runways: [
    {
      runwayNumber: "01",
      mode: "MIXED",
      status: "AVAILABLE",
      occupiedBy: null,
      currentAction: "--",
      timeRemainingSeconds: null,
      planePosPct: null,
    },
    {
      runwayNumber: "02",
      mode: "MIXED",
      status: "AVAILABLE",
      occupiedBy: null,
      currentAction: "--",
      timeRemainingSeconds: null,
      planePosPct: null,
    },
    {
      runwayNumber: "03",
      mode: "MIXED",
      status: "AVAILABLE",
      occupiedBy: null,
      currentAction: "--",
      timeRemainingSeconds: null,
      planePosPct: null,
    },
  ],
  holding: [],
  takeoff: [],
  log: [],
};

// Try to load a config created on the configure page.
// Put whatever your configure page saves into sessionStorage/localStorage as JSON.
function loadConfigFromStorage(): SimulationConfig | null {
  if (typeof window === "undefined") return null;

  const keys = ["pp:simConfig", "pp_sim_config", "simulationConfig"];
  for (const k of keys) {
    const raw = sessionStorage.getItem(k) ?? localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // super lightweight validation:
      if (typeof parsed?.inboundFlowRate === "number" && typeof parsed?.outboundFlowRate === "number") return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

function deriveVisualRunwaysFromConfig(config: SimulationConfig): RunwayRow[] {
  return (config.runways ?? []).map((r) => {
    // try to extract "01" from "Runway 01", else keep whole id
    const match = String(r.id).match(/(\d{2})$/);
    const runwayNumber = match ? match[1] : String(r.id);

    return {
      runwayNumber,
      mode: r.mode,
      status: r.status,
      occupiedBy: null,
      currentAction: "--",
      timeRemainingSeconds: null,
      planePosPct: null,
    };
  });
}

export default function SimulationPage() {
  const router = useRouter();

  // backend base
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  // visual simulation state (playback)
  const [sim, setSim] = useState<SimulationState>(initialMockState);

  // UI toggles
  const [showVisual, setShowVisual] = useState(true);

  // Runway edits (draft)
  const [draftRunways, setDraftRunways] = useState<Record<string, { mode: RunwayMode; status: RunwayStatus }>>({});

  // backend integration state
  const [phase, setPhase] = useState<"idle" | "running" | "finished" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SimulateResponse | null>(null);

  // slowing down: minimum preview duration so it can’t instantly disappear
  const [minPreviewSeconds, setMinPreviewSeconds] = useState<number>(8);
  const startedAtRef = useRef<number | null>(null);

  // ticker interval
  const tickRef = useRef<number | null>(null);

  // Load config on mount (so your simulation page matches what you configured)
  const configRef = useRef<SimulationConfig | null>(null);
  useEffect(() => {
    const cfg = loadConfigFromStorage();
    configRef.current = cfg;

    // set up visual initial state based on config
    if (cfg?.runways?.length) {
      const runways = deriveVisualRunwaysFromConfig(cfg);
      setSim((prev) => ({
        ...prev,
        scenarioName: "Configured Scenario",
        runCountTotal: cfg.runCount ?? 1,
        runways,
      }));

      // initialise draft runways
      const map: Record<string, { mode: RunwayMode; status: RunwayStatus }> = {};
      for (const r of runways) map[r.runwayNumber] = { mode: r.mode, status: r.status };
      setDraftRunways(map);
    } else {
      // fallback draft state
      const map: Record<string, { mode: RunwayMode; status: RunwayStatus }> = {};
      for (const r of initialMockState.runways) map[r.runwayNumber] = { mode: r.mode, status: r.status };
      setDraftRunways(map);
    }
  }, []);

  // Keep draft in sync if runways list changes
  useEffect(() => {
    setDraftRunways((prev) => {
      const next = { ...prev };
      for (const r of sim.runways) {
        if (!next[r.runwayNumber]) next[r.runwayNumber] = { mode: r.mode, status: r.status };
      }
      return next;
    });
  }, [sim.runways]);

  const progressPct = useMemo(() => {
    if (sim.runCountTotal <= 0) return 0;
    return Math.min(100, Math.max(0, (sim.runIndex / sim.runCountTotal) * 100));
  }, [sim.runIndex, sim.runCountTotal]);

  function stopTicker() {
    if (tickRef.current != null) window.clearInterval(tickRef.current);
    tickRef.current = null;
  }

  function startTicker() {
    stopTicker();
    tickRef.current = window.setInterval(() => {
      setSim((prev) => {
        const elapsedSeconds = prev.elapsedSeconds + 1;

        // Runway visuals
        const runways: RunwayRow[] = prev.runways.map((r) => {
          // if runway closed, keep it empty visually
          if (r.status === "SNOW_CLEARANCE" || r.status === "RUNWAY_INSPECTION" || r.status === "EQUIPMENT_FAILURE") {
            return {
              ...r,
              occupiedBy: null,
              currentAction: "--",
              timeRemainingSeconds: null,
              planePosPct: null,
            };
          }

          // simple “occupancy” tick
          if (r.status === "OCCUPIED" && r.timeRemainingSeconds != null) {
            const t = Math.max(0, r.timeRemainingSeconds - 1);
            const pos = r.planePosPct == null ? 50 : Math.min(95, r.planePosPct + 1.6);

            if (t === 0) {
              return {
                ...r,
                status: "AVAILABLE",
                occupiedBy: null,
                currentAction: "--",
                timeRemainingSeconds: null,
                planePosPct: null,
              };
            }
            return { ...r, timeRemainingSeconds: t, planePosPct: pos };
          }

          // occasionally start an “operation” when available
          if (r.status === "AVAILABLE" && Math.random() < 0.06) {
            const isLanding = r.mode === "LANDING" || (r.mode === "MIXED" && Math.random() < 0.5);
            const callsign = isLanding
              ? `IN-${Math.floor(Math.random() * 90 + 10)}`
              : `OUT-${Math.floor(Math.random() * 90 + 10)}`;

            return {
              ...r,
              status: "OCCUPIED",
              occupiedBy: callsign,
              currentAction: isLanding ? "Landing" : "Take-off",
              timeRemainingSeconds: Math.floor(Math.random() * 40 + 30),
              planePosPct: Math.floor(Math.random() * 30 + 20),
            };
          }

          return r;
        });

        // queue visuals
        const takeoff = prev.takeoff.map((a) => ({ ...a, waitSeconds: a.waitSeconds + 1 }));
        const holding = prev.holding.map((a) => {
          const newFuel = Math.max(0, a.fuelRemainingMins - 0.02);
          const newEmergency: EmergencyStatus =
            newFuel <= 10 && a.emergencyStatus === "NONE" ? "FUEL" : a.emergencyStatus;
          return { ...a, fuelRemainingMins: newFuel, emergencyStatus: newEmergency };
        });

        let log = prev.log;
        if (elapsedSeconds % 10 === 0) {
          const at = fmtMMSS(elapsedSeconds);
          log = [{ at, message: "Visual tick (preview mode)" }, ...prev.log].slice(0, 12);
        }

        return { ...prev, elapsedSeconds, runways, takeoff, holding, log };
      });
    }, 1000);
  }

  async function runBackendSimulation() {
    setErrorMsg(null);
    setResult(null);

    // Build config to send
    const cfgFromStorage = configRef.current;

    // If configure page didn’t store anything yet, we fall back to a sensible config
    const config: SimulationConfig = cfgFromStorage ?? {
      inboundFlowRate: 15,
      outboundFlowRate: 15,
      durationMinutes: 60,
      runCount: 3,
      runways: sim.runways.map((r) => ({
        id: `Runway ${r.runwayNumber}`,
        mode: draftRunways[r.runwayNumber]?.mode ?? r.mode,
        status: draftRunways[r.runwayNumber]?.status ?? r.status,
      })),
    };

    // Reset visuals, start playback, start backend
    startedAtRef.current = Date.now();
    setPhase("running");
    setSim((prev) => ({
      ...prev,
      elapsedSeconds: 0,
      runIndex: 1,
      runCountTotal: config.runCount ?? 1,
      scenarioName: prev.scenarioName || "Scenario",
      runways: deriveVisualRunwaysFromConfig(config),
      holding: [],
      takeoff: [],
      log: [{ at: "00:00", message: "Simulation started" }],
    }));

    startTicker();

    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const data = (await res.json()) as SimulateResponse;
      setResult(data);

      // Save latest results for results page
      sessionStorage.setItem("pp:lastResults", JSON.stringify(data));

      // OPTIONAL: also persist on backend (your /save endpoint)
      try {
        await fetch(`${API_BASE}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch {
        // don’t fail UI if save fails
      }

      // ENFORCE “minimum preview time” so you can actually see the simulation
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsedMs = Date.now() - startedAt;
      const minMs = Math.max(0, minPreviewSeconds * 1000);

      if (elapsedMs < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsedMs));
      }

      stopTicker();
      setPhase("finished");
      setSim((prev) => ({
        ...prev,
        log: [{ at: fmtMMSS(prev.elapsedSeconds), message: "Simulation finished (backend results ready)" }, ...prev.log].slice(
          0,
          12
        ),
      }));
    } catch (err: any) {
      stopTicker();
      setPhase("error");
      setErrorMsg(err?.message ?? "Unknown error");
    }
  }

  const handleApplyChanges = () => {
    // NOTE: Your backend currently does not support live mid-run edits.
    // This applies changes to the VISUALS only.
    setSim((prev) => {
      const updated = prev.runways.map((r) => {
        const d = draftRunways[r.runwayNumber];
        if (!d) return r;

        const closing =
          d.status === "RUNWAY_INSPECTION" || d.status === "SNOW_CLEARANCE" || d.status === "EQUIPMENT_FAILURE";

        return {
          ...r,
          mode: d.mode,
          status: d.status,
          occupiedBy: closing ? null : r.occupiedBy,
          currentAction: closing ? "--" : r.currentAction,
          timeRemainingSeconds: closing ? null : r.timeRemainingSeconds,
          planePosPct: closing ? null : r.planePosPct,
        };
      });

      const at = fmtMMSS(prev.elapsedSeconds);
      const log: LogEntry[] = [{ at, message: "Runway changes applied (visual only)" }, ...prev.log].slice(0, 12);
      return { ...prev, runways: updated, log };
    });
  };

  // ----- shared UI styles -----
  const pageShell: React.CSSProperties = {
    minHeight: "100vh",
    background: LIGHT_BG,
    color: TEXT,
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
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

  // mini queue labels
  const holdingShort = sim.holding.map((a) => a.aircraftID).slice(0, 6);
  const takeoffShort = sim.takeoff.map((a) => a.aircraftID).slice(0, 6);

  return (
    <div style={pageShell}>
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {/* Top header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
          {/* Left: Running + progress */}
          <div style={card}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: DS_BLUE }}>Running Simulation…</h1>

            <div style={{ marginTop: 12 }}>
              <div style={{ height: 12, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: DS_BLUE }} />
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button style={buttonGhost} onClick={() => setShowVisual((s) => !s)}>
                  {showVisual ? "Hide Simulation" : "Show Simulation"}
                </button>

                <div style={{ fontSize: 14, color: "#374151" }}>
                  Run: <b>{sim.runIndex}/{sim.runCountTotal}</b>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontSize: 13, color: "#4b5563" }}>
                    Min preview (sec):{" "}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={minPreviewSeconds}
                      onChange={(e) => setMinPreviewSeconds(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                      style={{ width: 64, marginLeft: 6, padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: 6 }}
                    />
                  </label>

                  {phase !== "running" ? (
                    <button style={buttonPrimary} onClick={runBackendSimulation}>
                      Start
                    </button>
                  ) : (
                    <button
                      style={buttonGhost}
                      onClick={() => {
                        // allow user to stop visuals; backend already ran, but this is a “preview”
                        stopTicker();
                        setPhase("finished");
                      }}
                    >
                      Skip Preview
                    </button>
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

              <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
                Status:{" "}
                <b style={{ color: phase === "error" ? "#b91c1c" : "#111827" }}>
                  {phase === "idle" && "Ready"}
                  {phase === "running" && "Running (preview + backend compute)"}
                  {phase === "finished" && "Finished (results ready)"}
                  {phase === "error" && "Error"}
                </b>
                {errorMsg ? <span style={{ marginLeft: 8, color: "#b91c1c" }}>— {errorMsg}</span> : null}
              </div>
            </div>
          </div>

          {/* Right: Scenario info */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{sim.scenarioName}</div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#4b5563" }}>
                  Seed: <b>{sim.seed ?? "--"}</b>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, color: "#4b5563" }}>Simulation time (preview)</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{fmtMMSS(sim.elapsedSeconds)}</div>
              </div>
            </div>

            {result && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12, fontSize: 13, color: "#374151" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Backend results ready</div>
                <div>Runs: <b>{result.perRunResults?.length ?? 0}</b></div>
                <div>Keys: <b>{Object.keys(result.aggregatedResults ?? {}).length}</b></div>
              </div>
            )}
          </div>
        </div>

        {/* Visual + mini queues */}
        {showVisual && (
          <section style={{ marginTop: 16, ...card }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
              {/* Runway visual */}
              <div>
                <div style={{ ...smallLabel, marginBottom: 8 }}>Runways</div>

                <div style={{ display: "grid", gap: 18 }}>
                  {sim.runways.map((r) => (
                    <div
                      key={r.runwayNumber}
                      style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center" }}
                    >
                      <div style={{ fontWeight: 800, color: "#374151" }}>Runway {r.runwayNumber}</div>

                      <div style={{ position: "relative", height: 28 }}>
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            height: 3,
                            background: "#111827",
                            transform: "translateY(-50%)",
                          }}
                        />

                        {r.planePosPct != null && (
                          <div
                            title={r.occupiedBy ? `Aircraft ${r.occupiedBy}` : "Aircraft"}
                            style={{
                              position: "absolute",
                              left: `${r.planePosPct}%`,
                              top: 0,
                              transform: "translateX(-50%)",
                              fontSize: 18,
                              lineHeight: "28px",
                            }}
                          >
                            ✈️
                          </div>
                        )}

                        <div style={{ position: "absolute", right: 0, top: -2, fontSize: 12, color: "#6b7280" }}>
                          {modeLabel(r.mode)} · {statusLabel(r.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini queue boxes */}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Holding Pattern</div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    {holdingShort.length ? holdingShort.map((c) => `↠ ${c}`).join(", ") : "--"}
                  </div>
                </div>

                <div style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Take-off Queue</div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    {takeoffShort.length ? takeoffShort.map((c) => `↠ ${c}`).join(", ") : "--"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Queue tables row */}
        <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Holding table */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={sectionTitle}>Holding Pattern</h2>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{sim.holding.length} aircraft</div>
            </div>

            <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${BORDER}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Aircraft</th>
                    <th style={{ textAlign: "center", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Callsign</th>
                    <th style={{ textAlign: "center", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Emergency</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Emergency type</th>
                    <th style={{ textAlign: "center", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Fuel</th>
                  </tr>
                </thead>

                <tbody>
                  {sim.holding.map((a) => (
                    <tr key={a.aircraftID}>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}` }}>Aircraft {a.aircraftID}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center", fontWeight: 900 }}>
                        {a.aircraftID}
                      </td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {a.emergencyStatus === "NONE" ? "F" : "T"}
                      </td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}` }}>{emergencyLabel(a.emergencyStatus)}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {Math.round(a.fuelRemainingMins)}min
                      </td>
                    </tr>
                  ))}

                  {sim.holding.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, textAlign: "center", color: "#6b7280" }}>
                        No inbound aircraft currently holding.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Takeoff table */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={sectionTitle}>Take-off Queue</h2>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{sim.takeoff.length} aircraft</div>
            </div>

            <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${BORDER}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Aircraft</th>
                    <th style={{ textAlign: "center", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Callsign</th>
                    <th style={{ textAlign: "center", padding: 10, borderBottom: `1px solid ${BORDER}` }}>Wait time</th>
                  </tr>
                </thead>

                <tbody>
                  {sim.takeoff.map((a) => (
                    <tr key={a.aircraftID}>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}` }}>Aircraft {a.aircraftID}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center", fontWeight: 900 }}>
                        {a.aircraftID}
                      </td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {fmtMMSS(a.waitSeconds)}
                      </td>
                    </tr>
                  ))}

                  {sim.takeoff.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, textAlign: "center", color: "#6b7280" }}>
                        No outbound aircraft currently queued.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Runway occupancy + edits */}
        <section style={{ marginTop: 16, ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={sectionTitle}>Runway Occupancy</h2>
            <button style={buttonPrimary} onClick={handleApplyChanges}>Apply Changes</button>
          </div>

          <div style={{ overflowX: "auto", border: `1px solid ${BORDER}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "left" }}>Runway</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>Mode</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>Status</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>Aircraft Callsign</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>Current Action</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>Time Remaining</th>
                </tr>
              </thead>

              <tbody>
                {sim.runways.map((r) => {
                  const draft = draftRunways[r.runwayNumber] ?? { mode: r.mode, status: r.status };
                  const timeRem = r.timeRemainingSeconds == null ? "--" : fmtMMSS(r.timeRemainingSeconds);

                  return (
                    <tr key={r.runwayNumber}>
                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, fontWeight: 900 }}>
                        Runway {r.runwayNumber}
                      </td>

                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        <select
                          value={draft.mode}
                          onChange={(e) =>
                            setDraftRunways((prev) => ({
                              ...prev,
                              [r.runwayNumber]: { ...(prev[r.runwayNumber] ?? { mode: r.mode, status: r.status }), mode: e.target.value as RunwayMode },
                            }))
                          }
                          style={{ width: 140, padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: 6 }}
                        >
                          <option value="TAKEOFF">Take-off</option>
                          <option value="LANDING">Landing</option>
                          <option value="MIXED">Mixed mode</option>
                        </select>
                      </td>

                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDraftRunways((prev) => ({
                              ...prev,
                              [r.runwayNumber]: { ...(prev[r.runwayNumber] ?? { mode: r.mode, status: r.status }), status: e.target.value as RunwayStatus },
                            }))
                          }
                          style={{ width: 180, padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: 6 }}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="RUNWAY_INSPECTION">Runway inspection</option>
                          <option value="SNOW_CLEARANCE">Snow clearance</option>
                          <option value="EQUIPMENT_FAILURE">Equipment failure</option>
                        </select>
                      </td>

                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center", fontWeight: 900 }}>
                        {r.occupiedBy ?? "--"}
                      </td>

                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {r.currentAction}
                      </td>

                      <td style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {timeRem}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live action log */}
        <section style={{ marginTop: 16, ...card }}>
          <h2 style={{ ...sectionTitle, textAlign: "center" }}>Live Action Log</h2>

          <div style={{ border: `1px solid ${BORDER}`, background: "#111827", color: "#f9fafb", padding: 12, maxHeight: 210, overflowY: "auto" }}>
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