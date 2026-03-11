"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";
const LIGHT_BG = "#f6f8fb";
const PANEL_BG = "#eef2f6";

const round1 = (n: number) => Math.round(n * 10) / 10;

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
    return (
      <div
        style={{
          minHeight: "100vh",
          background: LIGHT_BG,
          color: TEXT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "100px",
        }}
      >
        <Header />
        <h2 style={{ fontSize: 24, marginBottom: 20 }}>
          No simulation data found.
        </h2>
        <p style={{ marginBottom: 20 }}>
          Please configure and run a scenario first.
        </p>
        <Link href="/configure">
          <button
            style={{
              padding: "12px 24px",
              background: DS_BLUE,
              color: "#fff",
              borderRadius: 8,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Go to Configurator
          </button>
        </Link>
      </div>
    );
  }

  const config = simData.configurationUsed;
  const aggregated = simData.aggregatedResults;

  const scenario = {
    name: "Custom Simulation",
    seed: config.seed || "Randomized",
    runCount: config.runCount,
    runways: config.runways.length,
    inboundFlow: config.inboundFlowRate,
    outboundFlow: config.outboundFlowRate,
    maxWaitTimeMins: 30,
  };

  const tableMappings = [
    { key: "diverted", label: "Aircraft Diversions" },
    { key: "cancelled", label: "Cancellations" },
    { key: "holdingQueueSizeRemaining", label: "Remaining Landing Queue" },
    { key: "takeoffQueueSizeRemaining", label: "Remaining Take-Off Queue" },
    { key: "averageDelayMins", label: "Avg Delay / mins" },
    { key: "totalProcessed", label: "Total Aircraft Processed" },
  ];

  const aggRisk = [
    {
      label: "Mean Aircraft Diversions",
      value: aggregated.diverted?.mean ?? 0,
    },
    {
      label: "Mean Cancellations",
      value: aggregated.cancelled?.mean ?? 0,
    },
  ];

  const aggPerf = [
    {
      label: "Avg remaining landing queue",
      value: aggregated.holdingQueueSizeRemaining?.mean ?? 0,
    },
    {
      label: "Avg remaining take-off queue",
      value: aggregated.takeoffQueueSizeRemaining?.mean ?? 0,
    },
    {
      label: "Avg delay / mins",
      value: aggregated.averageDelayMins?.mean ?? 0,
    },
    {
      label: "Mean aircraft processed",
      value: aggregated.totalProcessed?.mean ?? 0,
    },
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
    <div
      style={{
        minHeight: "100vh",
        background: LIGHT_BG,
        color: TEXT,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <Header />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <h1
          style={{
            margin: "10px 0 6px",
            fontSize: 28,
            fontWeight: 800,
            color: DS_BLUE,
          }}
        >
          Results <span style={{ fontWeight: 600, color: TEXT }}>–</span>{" "}
          <span
            style={{
              fontStyle: "italic",
              fontWeight: 700,
              color: TEXT,
            }}
          >
            {scenario.name}
          </span>
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 14,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              padding: 12,
              minWidth: 460,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 14,
              }}
            >
              <div>
                Seed: <b>{scenario.seed}</b>
              </div>
              <div>
                Inbound flow: <b>{scenario.inboundFlow} /hr</b>
              </div>
              <div>
                Run Count: <b>{scenario.runCount}</b>
              </div>
              <div>
                Outbound flow: <b>{scenario.outboundFlow} /hr</b>
              </div>
              <div>
                Runways: <b>{scenario.runways}</b>
              </div>
              <div>
                Max wait time: <b>{scenario.maxWaitTimeMins}m</b>
              </div>
            </div>
          </div>
        </div>

        <h2
          style={{
            textAlign: "center",
            marginTop: 26,
            marginBottom: 10,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Overview
        </h2>

        <section
          style={{
            border: `1px solid ${BORDER}`,
            background: PANEL_BG,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                padding: 14,
              }}
            >
              <h3
                style={{
                  textAlign: "center",
                  margin: "0 0 12px",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
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
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                padding: 14,
              }}
            >
              <h3
                style={{
                  textAlign: "center",
                  margin: "0 0 12px",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
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
                    <div
                      style={{
                        borderBottom: "2px dotted #9aa4b2",
                        height: 0,
                      }}
                    />
                    <div
                      style={{
                        border: `1px solid ${TEXT}`,
                        textAlign: "center",
                        padding: "5px 0",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <h2
          style={{
            textAlign: "center",
            marginTop: 30,
            marginBottom: 10,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Per-Run Metrics
        </h2>

        <section
          style={{
            border: `1px solid ${BORDER}`,
            padding: 10,
            background: "#fff",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 820,
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      border: `1px solid ${BORDER}`,
                      padding: 10,
                      textAlign: "left",
                    }}
                  >
                    Metric
                  </th>
                  {Array.from({ length: scenario.runCount }, (_, i) => (
                    <th
                      key={i}
                      style={{
                        border: `1px solid ${BORDER}`,
                        padding: 10,
                      }}
                    >
                      Run {i + 1}
                    </th>
                  ))}
                  <th
                    style={{
                      border: `1px solid ${BORDER}`,
                      padding: 10,
                    }}
                  >
                    Mean
                  </th>
                  <th
                    style={{
                      border: `1px solid ${BORDER}`,
                      padding: 10,
                    }}
                  >
                    Std Dev
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableMappings.map((mapping) => (
                  <tr key={mapping.key}>
                    <td
                      style={{
                        border: `1px solid ${BORDER}`,
                        padding: 10,
                      }}
                    >
                      {mapping.label}
                    </td>

                    {simData.perRunResults.map((run: any, i: number) => (
                      <td
                        key={i}
                        style={{
                          border: `1px solid ${BORDER}`,
                          padding: 10,
                          textAlign: "center",
                        }}
                      >
                        {round1(run[mapping.key])}
                      </td>
                    ))}

                    <td
                      style={{
                        border: `1px solid ${BORDER}`,
                        padding: 10,
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {aggregated[mapping.key]?.mean ?? 0}
                    </td>
                    <td
                      style={{
                        border: `1px solid ${BORDER}`,
                        padding: 10,
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      {aggregated[mapping.key]?.stdDev ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
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
              New Scenario
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
              Compare Scenarios
            </button>
          </Link>

          <button
            onClick={handleSaveResults}
            disabled={isSaving}
            style={{
              padding: "12px 18px",
              cursor: isSaving ? "not-allowed" : "pointer",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: isSaving ? "#f3f4f6" : "#fff",
              color: TEXT,
              fontWeight: 700,
            }}
          >
            {isSaving ? "Saving..." : "Save Results"}
          </button>
        </div>
      </main>
    </div>
  );
}