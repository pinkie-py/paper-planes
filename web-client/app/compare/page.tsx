"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";
import HelpManual from "@/components/help_button";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

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
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchComparisonData() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3000/history');
        const json = await res.json();
        const history = json.data || [];

        setDataA(history.find((item: any) => String(item.id) === String(idA)));
        setDataB(history.find((item: any) => String(item.id) === String(idB)));
      } catch (err) {
        console.error("Failed to fetch comparison data", err);
      } finally {
        setLoading(false);
      }
    }

    if (idA && idB) fetchComparisonData();
    else setLoading(false); 
  }, [idA, idB]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById("pdf-compare-content");
    if (!element) return;

    try {
      // const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const canvas = await html2canvas(element, {useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Comparison_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !idA || !idB || !dataA || !dataB) {
    return (
      <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "sans-serif" }}>
        <Header />
        <main style={{ maxWidth: 800, margin: "80px auto", padding: "40px", textAlign: "center", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
          <h2 style={{ color: DS_BLUE, marginBottom: "16px" }}>{loading ? "Loading..." : "Simulation Data Not Found"}</h2>
          <Link href="/configure">
            <button style={{ padding: "12px 24px", background: DS_BLUE, color: "#fff", border: 'none', borderRadius: "6px", fontWeight: "bold", cursor: 'pointer' }}>
              Run a New Simulation
            </button>
          </Link>
        </main>
      </div>
    );
  }

  const getVal = (data: any, label: string) => {
    const row = data?.aggregatedResults?.rows?.find((r: any) => r.label === label);
    if (!row || !row.values || row.values.length === 0) return 0;
    return Number((row.values.reduce((a: number, b: number) => a + b, 0) / row.values.length).toFixed(1));
  };

  const chartData = [
    { metric: "Diversions", A: getVal(dataA, 'Aircraft Diversions'), B: getVal(dataB, 'Aircraft Diversions') },
    { metric: "Cancellations", A: getVal(dataA, 'Cancellations'), B: getVal(dataB, 'Cancellations') },
    { metric: "Emergencies", A: getVal(dataA, 'Fuel Emergency Events'), B: getVal(dataB, 'Fuel Emergency Events') },
  ];

  const perfChartData = [
    { metric: "Hold Queue", A: getVal(dataA, 'Avg Landing Queue size'), B: getVal(dataB, 'Avg Landing Queue size') },
    { metric: "T/O Queue", A: getVal(dataA, 'Avg Take-Off Queue size'), B: getVal(dataB, 'Avg Take-Off Queue size') },
    { metric: "Avg Delay (m)", A: getVal(dataA, 'Avg Delay / mins'), B: getVal(dataB, 'Avg Delay / mins') },
  ];

  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "sans-serif" }}>
      <Header />

      <div style={{ maxWidth: 1100, margin: "20px auto 0", display: "flex", justifyContent: "flex-end", padding: "0 20px" }}>
        <button onClick={handleExportPDF} disabled={isExporting} style={{ padding: "10px 16px", cursor: isExporting ? "wait" : "pointer", border: "none", borderRadius: 6, background: "#dc2626", color: "#fff", fontWeight: 700 }}>
          {isExporting ? "Generating PDF..." : "📄 Export PDF Comparison"}
        </button>
      </div>

      <main id="pdf-compare-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px" }}>
        <h1 style={{ margin: "10px 0 30px", fontSize: 28, fontWeight: 800, color: DS_BLUE, textAlign: 'center' }}>
          Compare Scenarios
        </h1>

        <div style={{ display: "flex", gap: "20px", marginBottom: 30 }}>
          <ScenarioConfig label="Scenario A" data={dataA} />
          <ScenarioConfig label="Scenario B" data={dataB} />
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: 40 }}>
          <div style={{ border: `1px solid ${BORDER}`, background: "#fff", padding: "20px", borderRadius: 6, height: 300 }}>
             <h3 style={{ textAlign: "center", margin: "0 0 16px", fontSize: 14, color: "#6b7280" }}>Risk Metrics Difference</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 20, left: -20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="metric" tick={{fontSize: 12}} />
                 <YAxis tick={{fontSize: 12}} />
                 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                 <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                 <Bar dataKey="A" name="Scenario A" fill="#9aa4b2" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="B" name="Scenario B" fill="#dc2626" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          <div style={{ border: `1px solid ${BORDER}`, background: "#fff", padding: "20px", borderRadius: 6, height: 300 }}>
             <h3 style={{ textAlign: "center", margin: "0 0 16px", fontSize: 14, color: "#6b7280" }}>Performance Difference</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={perfChartData} margin={{ top: 5, right: 0, bottom: 20, left: -20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="metric" tick={{fontSize: 12}} />
                 <YAxis tick={{fontSize: 12}} />
                 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                 <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                 <Bar dataKey="A" name="Scenario A" fill="#9aa4b2" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="B" name="Scenario B" fill={DS_BLUE} radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </section>

        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={tableHeaderStyle}>Category</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'left' }}>Metric</th>
              <th style={tableHeaderStyle}>A</th>
              <th style={tableHeaderStyle}>B</th>
              <th style={tableHeaderStyle}>Δ (B - A)</th>
            </tr>
          </thead>
          <tbody>
             <TableRow label="Aircraft Diversions" valA={getVal(dataA, 'Aircraft Diversions')} valB={getVal(dataB, 'Aircraft Diversions')} category="Risk" rowSpan={3} isLowerBetter />
             <TableRow label="Cancellations" valA={getVal(dataA, 'Cancellations')} valB={getVal(dataB, 'Cancellations')} isLowerBetter />
             <TableRow label="Fuel Emergencies" valA={getVal(dataA, 'Fuel Emergency Events')} valB={getVal(dataB, 'Fuel Emergency Events')} isLowerBetter />
             
             <TableRow label="Avg Landing Queue" valA={getVal(dataA, 'Avg Landing Queue size')} valB={getVal(dataB, 'Avg Landing Queue size')} category="Performance" rowSpan={3} isLowerBetter />
             <TableRow label="Avg Take-Off Queue" valA={getVal(dataA, 'Avg Take-Off Queue size')} valB={getVal(dataB, 'Avg Take-Off Queue size')} isLowerBetter />
             <TableRow label="Avg Delay /mins" valA={getVal(dataA, 'Avg Delay / mins')} valB={getVal(dataB, 'Avg Delay / mins')} isLowerBetter />
          </tbody>
        </table>
      </main>
      <HelpManual />
    </div>
  );
}

function ScenarioConfig({ label, data }: any) {
  const config = data?.configurationUsed ?? {};
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 16, flex: 1, borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: DS_BLUE }}>{label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: 14 }}>
        <div>Runways: <b>{config.runways?.length || 0}</b></div>
        <div>Inbound flow: <b>{config.inboundFlowRate}/hr</b></div>
        <div>Outbound flow: <b>{config.outboundFlowRate}/hr</b></div>
        <div>Simulated Runs: <b>{config.runCount}</b></div>
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
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, fontWeight: 600 }}>{label}</td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>{valA}</td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>{valB}</td>
      <td style={{ padding: 10, border: `1px solid ${BORDER}`, textAlign: 'center', fontWeight: 800, color: deltaColor, background: delta === 0 ? "transparent" : isGood ? "#f0fdf4" : "#fef2f2" }}>
        {delta > 0 ? `+${delta}` : delta}
      </td>
    </tr>
  );
}

const tableHeaderStyle: React.CSSProperties = { padding: '12px', border: `1px solid ${BORDER}`, fontWeight: 800 };