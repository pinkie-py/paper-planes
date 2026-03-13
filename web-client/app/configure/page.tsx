"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const BORDER = "#d0d7de";
const TEXT_DARK = "#1a1f36";

const max_runways = 25;
const max_inbound_flow_per_hour = 250;
const max_outbound_flow_per_hour = 250;
const max_runs = 50;
const max_duration_hours = 24;

const Configure: React.FC = () => {
  const router = useRouter();
  const [errorField, setErrorField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    inboundFlow: "1",
    outboundFlow: "1",
    numRuns: "1",
    seed: "",
    runways: "1",
    durationHours: "1",
  });

  const [runwayConfigs, setRunwayConfigs] = useState<Record<number, any>>({});

  useEffect(() => {
    const count = Math.min(max_runways, Math.max(1, parseInt(formData.runways) || 1));
    setRunwayConfigs((prev) => {
      const next = { ...prev };
      for (let i = 0; i < count; i++) {
        if (!next[i]) next[i] = { mode: "MIXED", status: "AVAILABLE" };
      }
      return next;
    });
  }, [formData.runways]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = parseInt(value);

    const limits: Record<string, number> = {
      runways: max_runways,
      inboundFlow: max_inbound_flow_per_hour,
      outboundFlow: max_outbound_flow_per_hour,
      numRuns: max_runs,
      durationHours: max_duration_hours,
    };

    if (!isNaN(val)) {
      if (limits[name] !== undefined && val > limits[name]) {
        setErrorField(`${name}_max`);
        return;
      }

      if ((name === "inboundFlow" || name === "outboundFlow") && val < 0) {
        setErrorField(`${name}_min`);
        return;
      }

      if ((name === "numRuns" || name === "durationHours" || name === "runways") && val < 1) {
        setErrorField(`${name}_min`);
        return;
      }
    }

    setErrorField(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRunSimulation = () => {
    const runwayCount = Math.min(max_runways, Math.max(1, parseInt(formData.runways) || 1));
    const hours = Math.min(max_duration_hours, Math.max(1, Number(formData.durationHours) || 1));

    const payload = {
      inboundFlowRate: Number(formData.inboundFlow) || 0,
      outboundFlowRate: Number(formData.outboundFlow) || 0,
      durationMinutes: hours * 60,
      runCount: Number(formData.numRuns) || 1,
      seed: formData.seed ? Number(formData.seed) : null,
      runways: Array.from({ length: runwayCount }).map((_, i) => ({
        id: `Runway ${String(i + 1).padStart(2, "0")}`,
        mode: runwayConfigs[i]?.mode || "MIXED",
        status: runwayConfigs[i]?.status || "AVAILABLE",
      })),
    };

    sessionStorage.setItem("pp:simConfig", JSON.stringify(payload));
    sessionStorage.removeItem("pp:lastResults");
    sessionStorage.removeItem("latestSimulation");
    router.push("/simulation");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", fontFamily: "sans-serif" }}>
      <Header />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
          <header>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: DS_BLUE, margin: 0 }}>
              Configure Scenario
            </h1>
            <p style={{ color: "#6b7280", marginTop: "8px" }}>
              Adjust variables to simulate airport traffic and performance.
            </p>
          </header>
          <button onClick={handleRunSimulation} style={applyButtonStyle}>
            Go to Live Simulation
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
          <section style={cardStyle}>
            <h2 style={sectionHeaderStyle}>Traffic & Run Settings</h2>
            <div style={{ display: "grid", gap: "15px" }}>
              <InputBlock label="Inbound flow per hour" name="inboundFlow" value={formData.inboundFlow} onChange={handleChange} min="0" max={max_inbound_flow_per_hour} />
              {errorField === "inboundFlow_max" && <ErrorMessage limit={max_inbound_flow_per_hour} />}
              {errorField === "inboundFlow_min" && <MinErrorMessage msg="Cannot be less than 0." />}

              <InputBlock label="Outbound flow per hour" name="outboundFlow" value={formData.outboundFlow} onChange={handleChange} min="0" max={max_outbound_flow_per_hour} />
              {errorField === "outboundFlow_max" && <ErrorMessage limit={max_outbound_flow_per_hour} />}
              {errorField === "outboundFlow_min" && <MinErrorMessage msg="Cannot be less than 0." />}

              <InputBlock label="No. of runways" name="runways" value={formData.runways} onChange={handleChange} min="1" max={max_runways} />
              {errorField === "runways_max" && <ErrorMessage limit={max_runways} />}
              {errorField === "runways_min" && <MinErrorMessage msg="Minimum 1 runway required." />}

              <InputBlock label="No. of runs" name="numRuns" value={formData.numRuns} onChange={handleChange} min="1" max={max_runs} />
              {errorField === "numRuns_max" && <ErrorMessage limit={max_runs} />}
              {errorField === "numRuns_min" && <MinErrorMessage msg="Minimum 1 run required." />}

              <InputBlock label={`Simulation duration (Max ${max_duration_hours}h)`} name="durationHours" value={formData.durationHours} onChange={handleChange} min="1" max={max_duration_hours} />
              {errorField === "durationHours_max" && <ErrorMessage limit={max_duration_hours} />}
              {errorField === "durationHours_min" && <MinErrorMessage msg="Duration must be at least 1 hour." />}

              <InputBlock label="Seed" name="seed" value={formData.seed} onChange={handleChange} placeholder="Optional" type="text" />
            </div>
          </section>

          <section style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", borderStyle: "dashed" }}>
            <p style={{ color: "#9ca3af", fontWeight: "600" }}>New Section Content Placeholder</p>



            
          </section>
        </div>

        <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "15px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: TEXT_DARK, margin: 0 }}>
              Runway Configuration
            </h2>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                  <th style={thStyle}>Runway</th>
                  <th style={thStyle}>Mode</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.min(max_runways, Math.max(0, parseInt(formData.runways) || 0)) }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ ...tdStyle, fontWeight: "900", color: TEXT_DARK }}>
                      Runway {String(i + 1).padStart(2, "0")}
                    </td>
                    <td style={tdStyle}>
                      <select 
                        style={selectStyle} 
                        value={runwayConfigs[i]?.mode} 
                        onChange={(e) => setRunwayConfigs({...runwayConfigs, [i]: {...runwayConfigs[i], mode: e.target.value}})}
                      >
                        <option value="MIXED">Mixed mode</option>
                        <option value="TAKEOFF">Take-off only</option>
                        <option value="LANDING">Landing only</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select 
                        style={selectStyle} 
                        value={runwayConfigs[i]?.status} 
                        onChange={(e) => setRunwayConfigs({...runwayConfigs, [i]: {...runwayConfigs[i], status: e.target.value}})}
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="RUNWAY_INSPECTION">Inspection</option>
                        <option value="SNOW_CLEARANCE">Snow clearance</option>
                        <option value="EQUIPMENT_FAILURE">Failure</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

const cardStyle: React.CSSProperties = { background: "white", padding: "24px", border: `1px solid ${BORDER}`, borderRadius: "8px" };
const sectionHeaderStyle: React.CSSProperties = { fontSize: "18px", fontWeight: "800", marginBottom: "20px", color: DS_BLUE, borderBottom: `1px solid ${BORDER}`, paddingBottom: "10px" };
const thStyle: React.CSSProperties = { padding: "12px 20px", fontSize: "14px", color: TEXT_DARK, fontWeight: "800", borderBottom: `1px solid ${BORDER}` };
const tdStyle: React.CSSProperties = { padding: "15px 20px", fontSize: "14px" };
const selectStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: "6px", border: `1px solid ${BORDER}`, fontSize: "13px", width: "180px", background: "white" };
const applyButtonStyle: React.CSSProperties = { padding: "12px 30px", background: DS_BLUE, color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" };

const ErrorMessage = ({ limit }: { limit: number }) => (
  <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>
    Maximum {limit} allowed.
  </p>
);

const MinErrorMessage = ({ msg }: { msg: string }) => (
  <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>
    {msg}
  </p>
);

const InputBlock = ({ label, name, value, onChange, placeholder = "", type = "number", max, min }: any) => (
  <div style={{ marginBottom: "10px" }}>
    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "600" }}>
      {label}
    </label>
    <input
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} max={max} min={min}
      style={{ width: "100%", padding: "10px", border: `1px solid ${BORDER}`, borderRadius: "4px" }}
    />
  </div>
);

export default Configure;