"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idA = searchParams.get("idA");
  const idB = searchParams.get("idB");

  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComparisonData() {
      try {
        setLoading(true);
        // Fetching the full history list 
        const res = await fetch('http://localhost:3000/history');
        const json = await res.json();
        const history = json.data;

        // Finding the specific items by ID
        const scenarioA = history.find((item: any) => item.id === idA);
        const scenarioB = history.find((item: any) => item.id === idB);

        setDataA(scenarioA);
        setDataB(scenarioB);
      } catch (err) {
        console.error("Failed to fetch comparison data", err);
      } finally {
        setLoading(false);
      }
    }

    if (idA && idB) {
      fetchComparisonData();
    }
  }, [idA, idB]);

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}>Loading Comparison...</div>;
  if (!dataA || !dataB) return <div style={{ padding: 50, textAlign: 'center' }}>Could not find simulation data.</div>;

  // Helper to get nested values safely
  const getVal = (data: any, key: string) => data?.aggregatedResults?.[key]?.mean ?? 0;
  const getConfig = (data: any) => data?.configurationUsed ?? {};

  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "sans-serif" }}>
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px" }}>
        <h1 style={{ margin: "10px 0 30px", fontSize: 28, fontWeight: 800, color: DS_BLUE, textAlign: 'center' }}>
          Compare Scenarios
        </h1>

        {/* 1. Configuration Cards */}
        <div style={{ display: "flex", gap: "20px", marginBottom: 40 }}>
          <ScenarioConfig label="A" data={dataA} config={getConfig(dataA)} />
          <ScenarioConfig label="B" data={dataB} config={getConfig(dataB)} />
        </div>

        {/* 2. Visual Risk Metrics */}
        <section style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 24, marginBottom: 40 }}>
          <h2 style={{ textAlign: "center", marginTop: 0, marginBottom: 26, fontSize: 18, fontWeight: 800 }}>
            Key Risk Metrics Comparison
          </h2>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <MetricBar label="Diversions" valA={getVal(dataA, 'diverted')} valB={getVal(dataB, 'diverted')} />
            <MetricBar label="Cancellations" valA={getVal(dataA, 'cancelled')} valB={getVal(dataB, 'cancelled')} />
          </div>
        </section>

        {/* 3. Data Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: `1px solid ${BORDER}` }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={tableHeaderStyle}>Category</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'left' }}>Metric</th>
              <th style={tableHeaderStyle}>A</th>
              <th style={tableHeaderStyle}>B</th>
              <th style={tableHeaderStyle}>Δ</th>
            </tr>
          </thead>
          <tbody>
             <TableRow label="Aircraft Diversions" valA={getVal(dataA, 'diverted')} valB={getVal(dataB, 'diverted')} category="Risk" rowSpan={2} isLowerBetter />
             <TableRow label="Cancellations" valA={getVal(dataA, 'cancelled')} valB={getVal(dataB, 'cancelled')} isLowerBetter />
             
             <TableRow label="Avg Landing Queue" valA={getVal(dataA, 'holdingQueueSizeRemaining')} valB={getVal(dataB, 'holdingQueueSizeRemaining')} category="Performance" rowSpan={3} isLowerBetter />
             <TableRow label="Avg Take-Off Queue" valA={getVal(dataA, 'takeoffQueueSizeRemaining')} valB={getVal(dataB, 'takeoffQueueSizeRemaining')} isLowerBetter />
             <TableRow label="Avg Delay /mins" valA={getVal(dataA, 'averageDelayMins')} valB={getVal(dataB, 'averageDelayMins')} isLowerBetter />
          </tbody>
        </table>
      </main>
    </div>
  );
}

// Sub-components
function ScenarioConfig({ label, data, config }: any) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 12, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: DS_BLUE }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{data.name || "Untitled Sim"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13 }}>
        <div>Runways: <b>{config.runways?.length || 0}</b></div>
        <div>Inbound: <b>{config.inboundFlowRate}/hr</b></div>
        <div>Outbound: <b>{config.outboundFlowRate}/hr</b></div>
        <div>Runs: <b>{config.runCount}</b></div>
      </div>
    </div>
  );
}

function MetricBar({ label, valA, valB }: any) {
  // Calculate a dynamic maximum to scale the bars proportionately.
  // We use 10 as a minimum baseline, but expand automatically if values are higher.
  const dynamicMax = Math.max(valA, valB, 10);
  
  const pctA = Math.max((valA / dynamicMax) * 100, 0);
  const pctB = Math.max((valB / dynamicMax) * 100, 0);

  // Helper to ensure even 0 has a neat visual representation without breaking bounds
  const renderBar = (val: number, pct: number, color: string) => (
    <div style={{ 
      width: `${pct}%`, 
      minWidth: val === 0 ? "24px" : "32px", // Ensures text doesn't overflow when 0
      background: color, 
      height: 22, 
      color: '#fff', 
      fontSize: 12, 
      fontWeight: 700,
      display: 'flex', 
      alignItems: 'center', 
      paddingLeft: 8,
      borderRadius: "0 4px 4px 0",
      transition: "width 0.3s ease" // Adds a nice smooth load animation
    }}>
      {val}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: `2px solid ${TEXT}` }}>
        {renderBar(valA, pctA, '#9aa4b2')}
        {renderBar(valB, pctB, DS_BLUE)}
      </div>
    </div>
  );
}

function TableRow({ label, valA, valB, category, rowSpan, isLowerBetter }: any) {
  const delta = Number((valB - valA).toFixed(1));
  const isGood = isLowerBetter ? delta < 0 : delta > 0;
  const deltaColor = delta === 0 ? TEXT : isGood ? "#059669" : "#dc2626";

  return (
    <tr>
      {category && <td rowSpan={rowSpan} style={{ padding: 10, border: `1px solid ${BORDER}`, fontWeight: 800, textAlign: 'center', background: PANEL_BG }}>{category}</td>}
      <td style={{ padding: 10, border: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{label}</span>
          <div style={{ flex: 1, borderBottom: '1px dotted #ccc' }} />
        </div>
      </td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>{valA}</td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>{valB}</td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center', fontWeight: 800, color: deltaColor }}>{delta > 0 ? `+${delta}` : delta}</td>
    </tr>
  );
}

const tableHeaderStyle: React.CSSProperties = { padding: '12px', border: `1px solid ${BORDER}`, fontWeight: 800 };