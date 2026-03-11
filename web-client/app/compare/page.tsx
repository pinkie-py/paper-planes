"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#e5e7eb"; // Darker grey for the info cards per image

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idA = searchParams.get("idA");
  const idB = searchParams.get("idB");

  // State for the two scenarios
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);

  useEffect(() => {
    // Mocking the data based on your image and previous logic
    const mockA = {
      name: "Example Scenario",
      runways: 3, inbound: 15, outbound: 15, wait: 30, runs: 3,
      fuel: 6, diversions: 1, cancellations: 13, 
      landQueue: 13, takeOffQueue: 13, waitArr: 14, waitDep: 21, delay: 10, processed: 345 
    };
    const mockB = {
      name: "Example Scenario 2",
      runways: 4, inbound: 15, outbound: 15, wait: 30, runs: 3,
      fuel: 6, diversions: 1, cancellations: 7, 
      landQueue: 9, takeOffQueue: 8, waitArr: 12, waitDep: 11, delay: 3, processed: 355 
    };

    setDataA(mockA);
    setDataB(mockB);
  }, [idA, idB]);

  if (!dataA || !dataB) return <div style={{ padding: 50 }}>Loading Comparison...</div>;

  // Reusable Styles
  const cardStyle: React.CSSProperties = {
    background: PANEL_BG,
    padding: '12px 20px',
    borderRadius: '2px',
    border: `1px solid #9ca3af`,
    flex: 1,
    fontSize: '14px',
    lineHeight: '1.6'
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: PANEL_BG,
    padding: '10px',
    border: `1px solid ${BORDER}`,
    fontWeight: 'bold',
    textAlign: 'center'
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: TEXT, fontFamily: "sans-serif" }}>
      <Header />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px" }}>
        
        <h1 style={{ textAlign: "center", fontSize: 28, marginBottom: 30 }}>Compare Saved Scenarios</h1>

        {/* 1. Top Section: Scenario Selectors and Info Cards */}
        <div style={{ display: "flex", gap: "40px", marginBottom: 40 }}>
          {/* Scenario A */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 'bold', color: '#6b7280' }}>A</span>
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${BORDER}` }}>
                    <option>{dataA.name}</option>
                </select>
            </div>
            <div style={cardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div><strong>Runways:</strong> {dataA.runways}</div>
                <div>Max wait time: {dataA.wait}</div>
                <div>Inbound flow: {dataA.inbound}</div>
                <div>Runs: {dataA.runs}</div>
                <div>Outbound flow: {dataA.outbound}</div>
              </div>
            </div>
          </div>

          {/* Scenario B */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 'bold', color: '#6b7280' }}>B</span>
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${BORDER}` }}>
                    <option>{dataB.name}</option>
                </select>
            </div>
            <div style={cardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div><strong>Runways:</strong> {dataB.runways}</div>
                <div>Max wait time: {dataB.wait}</div>
                <div>Inbound flow: {dataB.inbound}</div>
                <div>Runs: {dataB.runs}</div>
                <div>Outbound flow: {dataB.outbound}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Key Risk Metrics Graph */}
        <h3 style={{ textAlign: 'center', marginBottom: 20 }}>Key Risk Metrics Graph</h3>
        <div style={{ maxWidth: 600, margin: '0 auto 40px', paddingLeft: '100px', borderLeft: '1px solid #ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 15, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%' }} /> A</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, background: '#4b5563', borderRadius: '50%' }} /> B</div>
            </div>
            <MetricBar label="Fuel Emergencies" valA={dataA.fuel} valB={dataB.fuel} max={15} />
            <MetricBar label="Diversions" valA={dataA.diversions} valB={dataB.diversions} max={15} />
            <MetricBar label="Cancellations" valA={dataA.cancellations} valB={dataB.cancellations} max={15} />
        </div>

        {/* 3. Full Metric Comparison Table */}
        <h3 style={{ textAlign: 'center', marginBottom: 15 }}>Full Metric Comparison</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${BORDER}` }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderStyle, background: '#fff', border: 'none' }}></th>
              <th style={{ ...tableHeaderStyle, width: '300px', background: '#fff', border: 'none' }}></th>
              <th style={tableHeaderStyle}>A</th>
              <th style={tableHeaderStyle}>B</th>
              <th style={tableHeaderStyle}>Δ</th>
            </tr>
          </thead>
          <tbody>
             <TableRow label="Fuel Emergency Events" valA={dataA.fuel} valB={dataB.fuel} category="Risk" rowSpan={3} />
             <TableRow label="Aircraft Diversions" valA={dataA.diversions} valB={dataB.diversions} />
             <TableRow label="Cancellations" valA={dataA.cancellations} valB={dataB.cancellations} />
             
             <TableRow label="Avg Landing Queue size" valA={dataA.landQueue} valB={dataB.landQueue} category="Performance" rowSpan={6} />
             <TableRow label="Avg Take-Off Queue size" valA={dataA.takeOffQueue} valB={dataB.takeOffQueue} />
             <TableRow label="Avg Waiting Time (arrival) /mins" valA={dataA.waitArr} valB={dataB.waitArr} />
             <TableRow label="Avg Waiting Time (departure) /mins" valA={dataA.waitDep} valB={dataB.waitDep} />
             <TableRow label="Avg Delay /mins" valA={dataA.delay} valB={dataB.delay} />
             <TableRow label="Aircraft Processed" valA={dataA.processed} valB={dataB.processed} />
          </tbody>
        </table>
      </main>
    </div>
  );
}

// Sub-component for the Bar Chart
function MetricBar({ label, valA, valB, max }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '-110px', fontSize: 11, width: 100, textAlign: 'right', color: '#4b5563' }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ width: `${(valA/max)*100}%`, background: '#d1d5db', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{valA}</div>
        <div style={{ width: `${(valB/max)*100}%`, background: '#4b5563', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>{valB}</div>
      </div>
    </div>
  );
}

// Sub-component for Table Rows
function TableRow({ label, valA, valB, category, rowSpan }: any) {
  const cellStyle: React.CSSProperties = { padding: '8px 15px', border: `1px solid ${BORDER}`, textAlign: 'center' };
  const diff = Math.abs(valA - valB);

  return (
    <tr>
      {category && (
        <td rowSpan={rowSpan} style={{ ...cellStyle, fontWeight: 'bold', width: 100, background: '#fff', verticalAlign: 'middle' }}>
          {category}
        </td>
      )}
      <td style={{ ...cellStyle, textAlign: 'left', background: '#fff' }}>{label}</td>
      <td style={{ ...cellStyle, fontWeight: 'bold' }}>{valA}</td>
      <td style={{ ...cellStyle, fontWeight: 'bold' }}>{valB}</td>
      <td style={{ ...cellStyle }}>{diff}</td>
    </tr>
  );
}