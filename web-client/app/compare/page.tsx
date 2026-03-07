"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/header"; 



type MetricRow = {
  label: string;
  values: number[];
};

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";

// Math Utilities
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const stdDev = (xs: number[]) => {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const variance = xs.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function ComparePage() {
  // Scenario Context (To be pulled from state/backend later)
  const scenario = {
    name: "Comparison View",
    seed: 10001,
    runCount: 3,
  };

  // Mock Data matching your requirements
  const rows: MetricRow[] = [
    { label: "Fuel Emergency Events", values: [6, 9, 12] },
    { label: "Aircraft Diversions", values: [1, 1, 2] },
    { label: "Cancellations", values: [13, 13, 13] },
    { label: "Avg Landing Queue size", values: [13, 16, 10] },
    { label: "Avg Take-Off Queue size", values: [13, 15, 17] },
    { label: "Avg Waiting Time (arrival) / mins", values: [14, 20, 29] },
    { label: "Avg Waiting Time (departure) / mins", values: [21, 11, 16] },
    { label: "Avg Delay / mins", values: [10, 10, 25] },
    { label: "Aircraft Processed", values: [345, 355, 350] },
  ];

  const getRowValues = (label: string) => rows.find((r) => r.label === label)?.values ?? [];

  const aggRisk = [
    { label: "Mean Fuel Emergency Events", value: round1(mean(getRowValues("Fuel Emergency Events"))) },
    { label: "Mean Aircraft Diversions", value: round1(mean(getRowValues("Aircraft Diversions"))) },
    { label: "Mean Cancellations", value: round1(mean(getRowValues("Cancellations"))) },
  ];

  const aggPerf = [
    { label: "Avg landing queue size", value: round1(mean(getRowValues("Avg Landing Queue size"))) },
    { label: "Avg take-off queue size", value: round1(mean(getRowValues("Avg Take-Off Queue size"))) },
    { label: "Avg waiting time (arrival) / mins", value: round1(mean(getRowValues("Avg Waiting Time (arrival) / mins"))) },
    { label: "Avg waiting time (departure) / mins", value: round1(mean(getRowValues("Avg Waiting Time (departure) / mins"))) },
    { label: "Avg delay / mins", value: round1(mean(getRowValues("Avg Delay / mins"))) },
    { label: "Mean aircraft processed", value: round1(mean(getRowValues("Aircraft Processed"))) },
  ];

  const navLinkStyle: React.CSSProperties = {
    padding: "10px 14px",
    textDecoration: "none",
    color: TEXT,
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
  };

  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "sans-serif" }}>
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "10px 0 20px", fontSize: 28, fontWeight: 800, color: DS_BLUE }}>
          Compare Scenarios <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 18 }}>(Simulation ID: {scenario.seed})</span>
        </h1>

        {/* Top Summary Section */}
        <section style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 16, borderRadius: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
            
            {/* Risk Box */}
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14, borderRadius: 4 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Aggregated Risk</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {aggRisk.map((item) => (
                  <div key={item.label} style={{ display: "grid", gridTemplateColumns: "1fr 70px", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                    <div style={{ border: `2px solid ${TEXT}`, textAlign: "center", padding: "6px 0", fontWeight: 800 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Box */}
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14, borderRadius: 4 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Aggregated Performance</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {aggPerf.map((item) => (
                  <div key={item.label} style={{ display: "grid", gridTemplateColumns: "auto 1fr 70px", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <div>{item.label}</div>
                    <div style={{ borderBottom: "2px dotted #cbd5e1", height: 0 }} />
                    <div style={{ border: `1px solid ${BORDER}`, textAlign: "center", padding: "5px 0", background: LIGHT_BG }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Detailed Comparison Table */}
        <h2 style={{ textAlign: "center", marginTop: 30, marginBottom: 15, fontSize: 20, fontWeight: 800 }}>Per-Run Comparison</h2>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ padding: "14px", textAlign: "left", borderRight: `1px solid ${BORDER}` }}>Metric</th>
                {Array.from({ length: scenario.runCount }, (_, i) => (
                  <th key={i} style={{ padding: "14px", borderRight: `1px solid ${BORDER}` }}>Run {i + 1}</th>
                ))}
                <th style={{ padding: "14px", background: "#f1f5f9", borderRight: `1px solid ${BORDER}` }}>Mean</th>
                <th style={{ padding: "14px", background: "#f1f5f9" }}>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "12px", fontWeight: 600, fontSize: 14, borderRight: `1px solid ${BORDER}` }}>{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} style={{ padding: "12px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>{v}</td>
                  ))}
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: 800, background: "#f8fafc", borderRight: `1px solid ${BORDER}` }}>
                    {round1(mean(row.values))}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    {round1(stdDev(row.values))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 15 }}>
          <Link href="/results" style={{ padding: "12px 24px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, textDecoration: "none", color: TEXT, fontWeight: 700 }}>
            Back to Results
          </Link>
          <button style={{ padding: "12px 24px", background: DS_BLUE, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
            Export Comparison (PDF)
          </button>
        </div>
      </main>
    </div>
  );
}