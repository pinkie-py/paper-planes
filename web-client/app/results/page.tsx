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

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// simple sample std dev
const stdDev = (xs: number[]) => {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const variance = xs.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function ResultsPage() {
  // placeholder scenario details (REPLACE WITH REAL DATA LATER)
  const scenario = {
    name: "Example Scenario",
    seed: 10001,
    runCount: 3,
    runways: 3,
    inboundFlow: 15,
    outboundFlow: 15,
    maxWaitTimeMins: 30,
  };

  // placeholder per-run metrics (REPLACE WITH REAL RESULTS)
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
    <div
      style={{
        minHeight: "100vh",
        background: LIGHT_BG,
        color: TEXT,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <Header />

      {/* Page content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "10px 0 6px", fontSize: 28, fontWeight: 800, color: DS_BLUE }}>
          Results <span style={{ fontWeight: 600, color: TEXT }}>–</span>{" "}
          <span style={{ fontStyle: "italic", fontWeight: 700, color: TEXT }}>{scenario.name}</span>
        </h1>

        {/* Scenario info box */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 12, minWidth: 460 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
              <div>Seed: <b>{scenario.seed}</b></div>
              <div>Inbound flow: <b>{scenario.inboundFlow}</b></div>
              <div>Run Count: <b>{scenario.runCount}</b></div>
              <div>Outbound flow: <b>{scenario.outboundFlow}</b></div>
              <div>Runways: <b>{scenario.runways}</b></div>
              <div>Max wait time: <b>{scenario.maxWaitTimeMins}m</b></div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <h2 style={{ textAlign: "center", marginTop: 26, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>
          Overview
        </h2>

        <section style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
            {/* Aggregated Risk */}
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
                Aggregated Risk
              </h3>

              <div style={{ display: "grid", gap: 10 }}>
                {aggRisk.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 70px",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div
                      style={{
                        border: `2px solid ${TEXT}`,
                        textAlign: "center",
                        padding: "6px 0",
                        fontWeight: 800,
                        background: "#fff",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregated Performance */}
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14 }}>
              <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
                Aggregated Performance
              </h3>

              <div style={{ display: "grid", gap: 10 }}>
                {aggPerf.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr 70px",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                    }}
                  >
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

        {/* Per-run metrics table */}
        <h2 style={{ textAlign: "center", marginTop: 30, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>
          Per-Run Metrics
        </h2>

        <section style={{ border: `1px solid ${BORDER}`, padding: 10, background: "#fff" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "left" }}>Metric</th>
                  {Array.from({ length: scenario.runCount }, (_, i) => (
                    <th key={i} style={{ border: `1px solid ${BORDER}`, padding: 10 }}>
                      Run {i + 1}
                    </th>
                  ))}
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Mean</th>
                  <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Std Dev</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const m = mean(row.values);
                  const sd = stdDev(row.values);
                  return (
                    <tr key={row.label}>
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10 }}>{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center" }}>
                          {v}
                        </td>
                      ))}
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center" }}>{round1(m)}</td>
                      <td style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "center" }}>{round1(sd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom buttons */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/configure">
            <button
              style={{
                padding: "12px 18px",
                cursor: "pointer",
                border: "none",
                borderRadius: 8,
                background: DS_BLUE,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Configure Scenario
            </button>
          </Link>

          <Link href="/compare">
            <button
              style={{
                padding: "12px 18px",
                cursor: "pointer",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                background: "#fff",
                color: TEXT,
                fontWeight: 700,
              }}
            >
              Compare with Another Scenario
            </button>
          </Link>

          <button
            style={{
              padding: "12px 18px",
              cursor: "pointer",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: "#fff",
              color: TEXT,
              fontWeight: 700,
            }}
            
          >
            Save Results
          </button>
        </div>
      </main>
    </div>
  );
}

/*"use client";

import React from "react";
import Link from "next/link";

type MetricRow = {
  label: string;
  values: number[];
};

const mean = (xs: number[]) => {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

// simple sample std dev
const stdDev = (xs: number[]) => {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const variance =
    xs.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const Results: React.FC = () => {
  // placeholder scenario details (PASS FROM BACKEND)
  const scenario = {
    name: "Example Scenario",
    seed: 10001,
    runCount: 3,
    runways: 3,
    inboundFlow: 15,
    outboundFlow: 15,
    maxWaitTimeMins: 30,
  };

  // placeholder per-run metrics (REPLACE WITH REAL RESULTS)
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

  const getRowValues = (label: string) =>
    rows.find((r) => r.label === label)?.values ?? [];

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

  const handleSaveResults = () => {
    // call backend or download JSON/CSV


    alert("Save Results not implemented yet.");
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      {// Header *}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid #111",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              ⌂
            </div>
            <span style={{ fontWeight: 600 }}>Home</span>
          </div>
        </Link>

        <h1 style={{ margin: 0, fontSize: "28px" }}>
          Results - <span style={{ fontStyle: "italic" }}>{scenario.name}</span>
        </h1>

        {/* spacer so title stays centred-ish *}
        <div style={{ width: "90px" }} />
      </header>

      {/* Scenario info box *}
      <div style={{ marginTop: "18px", display: "flex", justifyContent: "center" }}>
        <div style={{ border: "1px solid #111", padding: "12px", minWidth: "420px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>Seed: {scenario.seed}</div>
            <div>Inbound flow: {scenario.inboundFlow}</div>
            <div>Run Count: {scenario.runCount}</div>
            <div>Outbound flow: {scenario.outboundFlow}</div>
            <div>Runways: {scenario.runways}</div>
            <div>Max wait time: {scenario.maxWaitTimeMins}m</div>
          </div>
        </div>
      </div>

      {/* Overview *}
      <h2 style={{ textAlign: "center", marginTop: "26px", marginBottom: "10px" }}>Overview</h2>

      <section style={{ border: "2px solid #111", background: "#004696", padding: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "16px" }}>
          {/* Aggregated Risk *}
          <div style={{ background: "#fff", border: "1px solid #6c6c6c", padding: "14px" }}>
            <h3 style={{ textAlign: "center", marginTop: 0, marginBottom: "12px" }}>Aggregated Risk</h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {aggRisk.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 60px",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div style={{ border: "2px solid #111", textAlign: "center", padding: "6px 0", fontWeight: 700 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aggregated Performance *}
          <div style={{ background: "#fff", border: "1px solid #111", padding: "14px" }}>
            <h3 style={{ textAlign: "center", marginTop: 0, marginBottom: "12px" }}>Aggregated Performance</h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {aggPerf.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 60px",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div>{item.label}</div>
                  <div style={{ borderBottom: "2px dotted #777", height: 0 }} />
                  <div style={{ border: "1px solid #111", textAlign: "center", padding: "4px 0" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Per-run metrics table *}
      <h2 style={{ textAlign: "center", marginTop: "30px", marginBottom: "10px" }}>Per-Run Metrics</h2>

      <section style={{ border: "1px solid #111", padding: "10px", background: "#fff" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "#e9e9e9" }}>
                <th style={{ border: "1px solid #111", padding: "10px", textAlign: "left" }}>Metric</th>
                {Array.from({ length: scenario.runCount }, (_, i) => (
                  <th key={i} style={{ border: "1px solid #111", padding: "10px" }}>
                    Run {i + 1}
                  </th>
                ))}
                <th style={{ border: "1px solid #111", padding: "10px" }}>Mean</th>
                <th style={{ border: "1px solid #111", padding: "10px" }}>Standard Deviation</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const m = mean(row.values);
                const sd = stdDev(row.values);
                return (
                  <tr key={row.label}>
                    <td style={{ border: "1px solid #111", padding: "10px" }}>{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} style={{ border: "1px solid #111", padding: "10px", textAlign: "center" }}>
                        {v}
                      </td>
                    ))}
                    <td style={{ border: "1px solid #111", padding: "10px", textAlign: "center" }}>{round1(m)}</td>
                    <td style={{ border: "1px solid #111", padding: "10px", textAlign: "center" }}>{round1(sd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom buttons *}
      <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "16px" }}>
        <Link href="/configure">
          <button style={{ padding: "12px 18px", cursor: "pointer" }}>Configure Scenario</button>
        </Link>

        <Link href="/compare">
          <button style={{ padding: "12px 18px", cursor: "pointer" }}>Compare with Another Scenario</button>
        </Link>

        <button style={{ padding: "12px 18px", cursor: "pointer" }} onClick={handleSaveResults}>
          Save Results
        </button>
      </div>
    </div>
  );
};

export default Results; */