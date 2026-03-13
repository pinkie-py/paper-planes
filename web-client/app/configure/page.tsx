"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const BORDER = "#d0d7de";

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

  const [closedRunways, setClosedRunways] = useState<number[]>([]);

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

    if (name === "runways") {
      setClosedRunways([]);
    }
  };

  const toggleRunwayStatus = (index: number) => {
    setClosedRunways((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const runwayCount = Math.min(max_runways, Math.max(1, parseInt(formData.runways) || 1));
  const displayCount = Math.min(runwayCount, 10);

  const handleRunSimulation = () => {
    const hours = Math.min(
      max_duration_hours,
      Math.max(1, Number(formData.durationHours) || 1)
    );

    const payload = {
      inboundFlowRate: Number(formData.inboundFlow) || 0,
      outboundFlowRate: Number(formData.outboundFlow) || 0,
      durationMinutes: hours * 60,
      runCount: Number(formData.numRuns) || 1,
      seed: formData.seed ? Number(formData.seed) : null,
      runways: Array.from({ length: runwayCount }).map((_, i) => ({
        id: `Runway ${String(i + 1).padStart(2, "0")}`,
        mode: "MIXED",
        status: closedRunways.includes(i)
          ? "RUNWAY_INSPECTION"
          : "AVAILABLE",
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

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
        <header style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: DS_BLUE, margin: 0 }}>
            Configure Scenario
          </h1>
          <p style={{ color: "#6b7280", marginTop: "8px" }}>
            Adjust the variables below to simulate airport traffic and runway performance.
          </p>
        </header>

        <div style={{ marginBottom: "30px" }}>
          <button
            onClick={handleRunSimulation}
            style={{
              padding: "12px 40px",
              background: DS_BLUE,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Go to Live Simulation
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
          <section style={{ background: "white", padding: "24px", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", color: DS_BLUE, borderBottom: `1px solid ${BORDER}`, paddingBottom: "10px" }}>
              Traffic & Run Settings
            </h2>

            <div style={{ display: "grid", gap: "15px" }}>
              <InputBlock
                label="Inbound flow per hour"
                name="inboundFlow"
                value={formData.inboundFlow}
                onChange={handleChange}
                min="0"
                max={max_inbound_flow_per_hour}
              />
              {errorField === "inboundFlow_max" && <ErrorMessage limit={max_inbound_flow_per_hour} />}
              {errorField === "inboundFlow_min" && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>Cannot be less than 0.</p>}

              <InputBlock
                label="Outbound flow per hour"
                name="outboundFlow"
                value={formData.outboundFlow}
                onChange={handleChange}
                min="0"
                max={max_outbound_flow_per_hour}
              />
              {errorField === "outboundFlow_max" && <ErrorMessage limit={max_outbound_flow_per_hour} />}
              {errorField === "outboundFlow_min" && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>Cannot be less than 0.</p>}

              <InputBlock
                label="No. of runs"
                name="numRuns"
                value={formData.numRuns}
                onChange={handleChange}
                min="1"
                max={max_runs}
              />
              {errorField === "numRuns_max" && <ErrorMessage limit={max_runs} />}
              {errorField === "numRuns_min" && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>Minimum 1 run required.</p>}

              <InputBlock
                label={`Simulation duration (Max ${max_duration_hours}h)`}
                name="durationHours"
                value={formData.durationHours}
                onChange={handleChange}
                min="1"
                max={max_duration_hours}
              />
              {errorField === "durationHours_max" && <ErrorMessage limit={max_duration_hours} />}
              {errorField === "durationHours_min" && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>Duration must be at least 1 hour.</p>}

              <InputBlock
                label="Seed"
                name="seed"
                value={formData.seed}
                onChange={handleChange}
                placeholder="Optional"
                type="text"
              />
            </div>
          </section>

          <section style={{ background: "white", padding: "24px", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", color: DS_BLUE, borderBottom: `1px solid ${BORDER}`, paddingBottom: "10px" }}>
              Runway Settings
            </h2>

            <InputBlock
              label="No. of runways"
              name="runways"
              value={formData.runways}
              onChange={handleChange}
              min="1"
              max={max_runways}
            />
            {errorField === "runways_max" && <ErrorMessage limit={max_runways} />}
            {errorField === "runways_min" && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>Minimum 1 runway required.</p>}

            {displayCount > 0 && (
              <div style={{ marginTop: "25px", borderTop: `1px solid ${BORDER}`, paddingTop: "15px" }}>
                <h3 style={{ fontSize: "14px", color: "#4b5563", marginBottom: "10px" }}>Active Runways:</h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {Array.from({ length: displayCount }).map((_, i) => {
                    const isClosed = closedRunways.includes(i);
                    return (
                      <div key={i} style={{ padding: "10px", background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                        <span style={{ fontWeight: "700", color: DS_BLUE }}>
                          Runway {String(i + 1).padStart(2, "0")}
                        </span>
                        <button
                          onClick={() => toggleRunwayStatus(i)}
                          style={{ padding: "4px 10px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "white", background: isClosed ? "#dc2626" : "#10b981", minWidth: "85px" }}
                        >
                          {isClosed ? "Closed" : "Available"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const ErrorMessage = ({ limit }: { limit: number }) => (
  <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-10px", marginBottom: "5px", fontWeight: "600" }}>
    Maximum {limit} allowed.
  </p>
);

const InputBlock = ({ label, name, value, onChange, placeholder = "", type = "number", max, min }: any) => (
  <div style={{ marginBottom: "10px" }}>
    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "600" }}>
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      max={max}
      min={min}
      style={{
        width: "100%",
        padding: "10px",
        border: `1px solid ${BORDER}`,
        borderRadius: "4px",
      }}
    />
  </div>
);

export default Configure;