"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/header";
import CompareButton from "@/components/compare_button";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ResultsPage() {
  const [simData, setSimData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const liveData = sessionStorage.getItem("pp:lastResults");
    const legacyData = sessionStorage.getItem("latestSimulation");
    const storedData = liveData ?? legacyData;

    if (storedData) {
      setSimData(JSON.parse(storedData));
    }
  }, []);

  if (!simData) {
    const buttonStyle: React.CSSProperties = {
      padding: '10px 20px',
      cursor: 'pointer',
      width: '200px',
      fontWeight: '600',
      background: '#fff',
      border: `1px solid ${BORDER}`,
      color: TEXT,
      borderRadius: '4px'
    };

    return (
      <div style={{ minHeight: "100vh", background: LIGHT_BG, fontFamily: 'sans-serif' }}>
        <Header />
        
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <header style={{ marginTop: '20px' }}>
            <h1 style={{ color: DS_BLUE, margin: '0 0 10px' }}>Airport simulation</h1>
            <h2 style={{ fontWeight: '400', fontSize: '18px' }}>No simulation data found</h2>
          </header>

          <main style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <p style={{ color: "#6b7280", marginBottom: "10px" }}>
              Please configure and run a scenario first to view results.
            </p>
            <Link href="/configure">
              <button style={{ ...buttonStyle, background: DS_BLUE, color: '#fff', border: 'none' }}>
                Back to configure
              </button>
            </Link>
            <Link href="/">
              <button style={buttonStyle}>
                Back to Home
              </button>
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const config = simData.configurationUsed;
  const aggregated = simData.aggregatedResults;
  
  // Extract rows dynamically supplied by analytics API
  const metricRows = aggregated?.rows || [];

  const scenario = {
    name: "Custom Simulation",
    seed: config.seed || "Randomized",
    runCount: config.runCount,
    runways: config.runways.length,
    inboundFlow: config.inboundFlowRate,
    outboundFlow: config.outboundFlowRate,
    maxWaitTimeMins: 30,
  };

  // Helper to find specific rows by the label assigned in results-formatter.ts
  const getMean = (label: string) => {
    const row = metricRows.find((r: any) => r.label === label);
    if (!row || !row.values || row.values.length === 0) return 0;
    const mean = row.values.reduce((a: number, b: number) => a + b, 0) / row.values.length;
    return round2(mean);
  };

  // Safe Math formulas to prevent NaN
  const calculateMean = (vals: number[]) => vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  const calculateStdDev = (vals: number[], mean: number) => vals.length > 1 ? Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (vals.length - 1)) : 0;

  const aggRisk = [
    { label: "Mean Aircraft Diversions", value: getMean("Aircraft Diversions") },
    { label: "Mean Cancellations", value: getMean("Cancellations") },
    { label: "Mean Fuel Emergencies", value: getMean("Fuel Emergency Events") },
  ];

  const aggPerf = [
    { label: "Avg remaining landing queue", value: getMean("Avg Landing Queue size") },
    { label: "Avg remaining take-off queue", value: getMean("Avg Take-Off Queue size") },
    { label: "Avg delay / mins", value: getMean("Avg Delay / mins") },
    { label: "Mean aircraft processed", value: getMean("Aircraft Processed") },
  ];

  const handleSaveResults = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("http://localhost:3000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simData),
      });

      if (!response.ok) throw new Error("Failed to save");
      alert("Simulation saved to database successfully!");
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend to save results.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "10px 0 6px", fontSize: 28, fontWeight: 800, color: DS_BLUE }}>
          Results <span style={{ fontWeight: 600, color: TEXT }}>–</span>{" "}
          <span style={{ fontStyle: "italic", fontWeight: 700, color: TEXT }}>{scenario.name}</span>
        </h1>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 12, minWidth: 460 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
              <div>Seed: <b>{scenario.seed}</b></div>
              <div>Inbound flow: <b>{scenario.inboundFlow} /hr</b></div>
              <div>Run Count: <b>{scenario.runCount}</b></div>
              <div>Outbound flow: <b>{scenario.outboundFlow} /hr</b></div>
              <div>Runways: <b>{scenario.runways}</b></div>
              <div>Max wait time: <b>{scenario.maxWaitTimeMins}m</b></div>
            </div>
          </div>
        </div>

        <h2 style={{ textAlign: "center", marginTop: 26, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>Overview</h2>

        <section style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Aggregated Risk</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {aggRisk.map((item) => (
                  <div key={item.label} style={{ display: "grid", gridTemplateColumns: "1fr 70px", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div style={{ border: `2px solid ${TEXT}`, textAlign: "center", padding: "6px 0", fontWeight: 800 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Aggregated Performance</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {aggPerf.map((item) => (
                  <div key={item.label} style={{ display: "grid", gridTemplateColumns: "auto 1fr 70px", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <div>{item.label}</div>
                    <div style={{ borderBottom: "2px dotted #9aa4b2", height: 0 }} />
                    <div style={{ border: `1px solid ${TEXT}`, textAlign: "center", padding: "5px 0" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <h2 style={{ textAlign: "center", marginTop: 30, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>Per-Run Metrics</h2>

        <section style={{ border: `1px solid ${BORDER}`, padding: 10, background: "#fff" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "left" }}>Metric</th>
                  {Array.from({ length: scenario.runCount }, (_, i) => (
                    <th key={i} style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Run {i + 1}</th>
                  ))}
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Mean</th>
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Std Dev</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row: any) => {
                  const mean = calculateMean(row.values);
                  const stdDev = calculateStdDev(row.values, mean);

                  return (
                    <tr key={row.label}>
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10 }}>{row.label}</td>
                      {row.values.map((val: number, i: number) => (
                        <td key={i} style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center" }}>
                          {round1(val)}
                        </td>
                      ))}
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center", fontWeight: "bold" }}>
                        {round2(mean)}
                      </td>
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center", color: "#6b7280" }}>
                        {round2(stdDev)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/configure">
            <button style={{ padding: "12px 18px", cursor: "pointer", border: "none", borderRadius: 8, background: DS_BLUE, color: "#fff", fontWeight: 700 }}>
              New Scenario
            </button>
          </Link>

          <CompareButton style={{ padding: "12px 18px", cursor: "pointer", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", color: TEXT, fontWeight: 700 }} />

          <button
            onClick={handleSaveResults}
            disabled={isSaving}
            style={{
              padding: "12px 18px", cursor: isSaving ? "not-allowed" : "pointer", border: `1px solid ${BORDER}`, borderRadius: 8, background: isSaving ? "#f3f4f6" : "#fff", color: TEXT, fontWeight: 700
            }}
          >
            {isSaving ? "Saving..." : "Save Results"}
          </button>
        </div>
      </main>
    </div>
  );
}