"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/header";
import CompareButton from "@/components/compare_button";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import HelpManual from "@/components/help_button";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ResultsPage() {
    const [simData, setSimData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const liveData = sessionStorage.getItem("pp:lastResults");
        const legacyData = sessionStorage.getItem("latestSimulation");
        const storedData = liveData ?? legacyData;

        if (storedData) {
            setSimData(JSON.parse(storedData));
        }
    }, []);

    if (!simData) {
        return (
            <div style={{ minHeight: "100vh", background: LIGHT_BG, fontFamily: "sans-serif" }}>
                <Header />
                <div style={{ textAlign: "center", padding: "20px", marginTop: "60px" }}>
                    <h1 style={{ color: DS_BLUE, margin: "0 0 10px" }}>Airport simulation</h1>
                    <h2 style={{ fontWeight: "400", fontSize: "18px" }}>No simulation data found</h2>
                    <Link href='/configure'>
                        <button
                            style={{
                                marginTop: 20,
                                padding: "10px 20px",
                                background: DS_BLUE,
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            Back to configure
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const config = simData.configurationUsed;
    const aggregated = simData.aggregatedResults;
    const metricRows = aggregated?.rows || [];

    const scenario = {
        name: "Simulation Report",
        seed: config.seed || "Randomized",
        runCount: config.runCount,
        runways: config.runways.length,
        inboundFlow: config.inboundFlowRate,
        outboundFlow: config.outboundFlowRate
    };

    const getMean = (label: string) => {
        const row = metricRows.find((r: any) => r.label === label);
        if (!row || !row.values || row.values.length === 0) return 0;
        return round2(row.values.reduce((a: number, b: number) => a + b, 0) / row.values.length);
    };

    const calculateMean = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    const calculateStdDev = (vals: number[], mean: number) =>
        vals.length > 1 ? Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (vals.length - 1)) : 0;

    // Process raw backend ticks into an average timeline chart
    const timeSeriesData = [];
    if (simData.perRunResults && simData.perRunResults.length > 0) {
        const maxTicks = Math.max(...simData.perRunResults.map((r: any) => r.ticks?.length || 0));
        for (let i = 0; i < maxTicks; i++) {
            let holding = 0;
            let takeoff = 0;
            simData.perRunResults.forEach((r: any) => {
                if (r.ticks && r.ticks[i]) {
                    holding += r.ticks[i].holdingCount || 0;
                    takeoff += r.ticks[i].takeoffQueueCount || 0;
                }
            });
            timeSeriesData.push({
                minute: i,
                holding: round1(holding / simData.perRunResults.length),
                takeoff: round1(takeoff / simData.perRunResults.length)
            });
        }
    }

    const handleExportPDF = async () => {
        setIsExporting(true);
        const element = document.getElementById("pdf-report-content");
        if (!element) return;

        try {
            // const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const canvas = await html2canvas(element, { useCORS: true });
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

            pdf.save(`Simulation_Report_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Generation failed", err);
            alert("Failed to generate PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveResults = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(API_BASE + "/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(simData)
            });
            if (!response.ok) throw new Error("Failed to save");
            alert("Simulation saved to database successfully!");
        } catch (error) {
            alert("Error connecting to backend to save results.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: LIGHT_BG, color: TEXT, fontFamily: "Inter, sans-serif" }}>
            <Header />

            {/* Action Bar (Not captured in PDF) */}
            <div
                style={{
                    maxWidth: 1100,
                    margin: "20px auto 0",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    padding: "0 20px"
                }}
            >
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    style={{
                        padding: "10px 16px",
                        cursor: isExporting ? "wait" : "pointer",
                        border: "none",
                        borderRadius: 6,
                        background: "#dc2626",
                        color: "#fff",
                        fontWeight: 700
                    }}
                >
                    {isExporting ? "Generating PDF..." : "📄 Export PDF"}
                </button>
                <button
                    onClick={handleSaveResults}
                    disabled={isSaving}
                    style={{
                        padding: "10px 16px",
                        cursor: isSaving ? "wait" : "pointer",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        background: "#fff",
                        fontWeight: 700
                    }}
                >
                    {isSaving ? "Saving..." : "💾 Save to Database"}
                </button>
                <Link href='/configure'>
                    <button
                        style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            border: "none",
                            borderRadius: 6,
                            background: DS_BLUE,
                            color: "#fff",
                            fontWeight: 700
                        }}
                    >
                        New Scenario
                    </button>
                </Link>
            </div>

            {/* Main Content Area (Captured in PDF) */}
            <main
                id='pdf-report-content'
                style={{ maxWidth: 1100, margin: "0 auto", padding: "20px" }}
            >
                <h1
                    style={{ margin: "10px 0 6px", fontSize: 28, fontWeight: 800, color: DS_BLUE, textAlign: "center" }}
                >
                    {scenario.name}
                </h1>

                <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
                    <div
                        style={{
                            background: "#fff",
                            border: `1px solid ${BORDER}`,
                            padding: 12,
                            minWidth: 500,
                            borderRadius: 6
                        }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 14 }}>
                            <div>
                                Inbound flow: <b>{scenario.inboundFlow} /hr</b>
                            </div>
                            <div>
                                Outbound flow: <b>{scenario.outboundFlow} /hr</b>
                            </div>
                            <div>
                                Runways Configured: <b>{scenario.runways}</b>
                            </div>
                            <div>
                                Simulated Runs: <b>{scenario.runCount}</b>
                            </div>
                            <div>
                                Random Seed: <b>{scenario.seed}</b>
                            </div>
                            <div>
                                Generated At: <b>{new Date().toLocaleString()}</b>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 style={{ textAlign: "center", marginTop: 26, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>
                    Aggregated Overview
                </h2>

                <section style={{ border: `1px solid ${BORDER}`, background: PANEL_BG, padding: 16, borderRadius: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div
                            style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14, borderRadius: 6 }}
                        >
                            <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
                                Risk Metrics
                            </h3>
                            <div style={{ display: "grid", gap: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Aircraft Diversions</span>{" "}
                                    <span style={{ color: "#dc2626" }}>{getMean("Aircraft Diversions")}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Flight Cancellations</span>{" "}
                                    <span style={{ color: "#dc2626" }}>{getMean("Cancellations")}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Fuel Emergencies</span>{" "}
                                    <span style={{ color: "#d97706" }}>{getMean("Fuel Emergency Events")}</span>
                                </div>
                            </div>
                        </div>

                        <div
                            style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: 14, borderRadius: 6 }}
                        >
                            <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
                                Performance Metrics
                            </h3>
                            <div style={{ display: "grid", gap: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Avg Landing Queue</span> <span>{getMean("Avg Landing Queue size")}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Avg Take-Off Queue</span> <span>{getMean("Avg Take-Off Queue size")}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Avg Delay / mins</span> <span>{getMean("Avg Delay / mins")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {timeSeriesData.length > 0 && (
                    <>
                        <h2
                            style={{
                                textAlign: "center",
                                marginTop: 30,
                                marginBottom: 10,
                                fontSize: 18,
                                fontWeight: 800
                            }}
                        >
                            Detailed Queue Analytics
                        </h2>
                        <section
                            style={{
                                border: `1px solid ${BORDER}`,
                                background: "#fff",
                                padding: "20px",
                                borderRadius: 6,
                                height: 350
                            }}
                        >
                            <h3 style={{ textAlign: "center", margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
                                Average Queue Lengths Over Time
                            </h3>
                            <ResponsiveContainer
                                width='100%'
                                height='100%'
                            >
                                <LineChart
                                    data={timeSeriesData}
                                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray='3 3'
                                        vertical={false}
                                        stroke='#e5e7eb'
                                    />
                                    <XAxis
                                        dataKey='minute'
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(tick) => `${tick}m`}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                                    <Line
                                        type='monotone'
                                        dataKey='holding'
                                        name='Holding Pattern (Inbound)'
                                        stroke='#d97706'
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                    <Line
                                        type='monotone'
                                        dataKey='takeoff'
                                        name='Take-off Queue (Outbound)'
                                        stroke={DS_BLUE}
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </section>
                    </>
                )}

                <h2 style={{ textAlign: "center", marginTop: 30, marginBottom: 10, fontSize: 18, fontWeight: 800 }}>
                    Statistical Breakdown
                </h2>

                <section style={{ border: `1px solid ${BORDER}`, padding: 10, background: "#fff", borderRadius: 6 }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    <th style={{ border: `1px solid ${BORDER}`, padding: 10, textAlign: "left" }}>
                                        Metric
                                    </th>
                                    <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Mean</th>
                                    <th style={{ border: `1px solid ${BORDER}`, padding: 10 }}>Std Dev</th>
                                    {Array.from({ length: scenario.runCount }, (_, i) => (
                                        <th
                                            key={i}
                                            style={{
                                                border: `1px solid ${BORDER}`,
                                                padding: 10,
                                                color: "#9ca3af",
                                                fontWeight: 500
                                            }}
                                        >
                                            Run {i + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {metricRows.map((row: any) => {
                                    const mean = calculateMean(row.values);
                                    const stdDev = calculateStdDev(row.values, mean);

                                    return (
                                        <tr key={row.label}>
                                            <td style={{ border: `1px solid ${BORDER}`, padding: 10, fontWeight: 600 }}>
                                                {row.label}
                                            </td>
                                            <td
                                                style={{
                                                    border: `1px solid ${BORDER}`,
                                                    padding: 10,
                                                    textAlign: "center",
                                                    fontWeight: "bold",
                                                    background: "#f0fdf4"
                                                }}
                                            >
                                                {round2(mean)}
                                            </td>
                                            <td
                                                style={{
                                                    border: `1px solid ${BORDER}`,
                                                    padding: 10,
                                                    textAlign: "center",
                                                    color: "#6b7280"
                                                }}
                                            >
                                                ± {round2(stdDev)}
                                            </td>
                                            {row.values.map((val: number, i: number) => (
                                                <td
                                                    key={i}
                                                    style={{
                                                        border: `1px solid ${BORDER}`,
                                                        padding: 10,
                                                        textAlign: "center",
                                                        color: "#6b7280"
                                                    }}
                                                >
                                                    {round1(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
            <HelpManual />
        </div>
    );
}
