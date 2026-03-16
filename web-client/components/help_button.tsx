"use client";
import React, { useState } from "react";

const HelpManual = () => {
    const [helpOpen, setHelpOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("Home");

    const tabs = ["Home", "Configure", "Simulation", "Results"];

    const tabStyle = (id: string): React.CSSProperties => ({
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: 500,
        cursor: "pointer",
        border: "none",
        borderRadius: "6px",
        background: activeTab === id ? "#185FA5" : "transparent",
        color: activeTab === id ? "#fff" : "#6b7280",
        transition: "0.2s",
        whiteSpace: "nowrap"
    });

    return (
        <>
            {/* Floating Help Button */}
            <button
                onClick={() => setHelpOpen(true)}
                style={{
                    position: "fixed",
                    bottom: "24px",
                    right: "24px",
                    // Adjusted these styles for text instead of an icon
                    padding: "0 20px",
                    height: "44px",
                    borderRadius: "22px",
                    backgroundColor: "#185FA5",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 9999
                }}
            >
                Help
            </button>

            {/* Manual Pop-up Window */}
            {helpOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(3px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        padding: "20px",
                        fontFamily: "sans-serif"
                    }}
                >
                    <div
                        style={{
                            background: "white",
                            borderRadius: "16px",
                            maxWidth: "500px",
                            width: "100%",
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                            overflow: "hidden",
                            border: "1px solid #e5e7eb"
                        }}
                    >
                        <div
                            style={{
                                padding: "20px",
                                borderBottom: "1px solid #f3f4f6",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                                Instructions Manual
                            </h2>
                            <button
                                onClick={() => setHelpOpen(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    color: "#9ca3af"
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "4px",
                                padding: "8px 12px",
                                background: "#f9fafb",
                                borderBottom: "1px solid #f3f4f6",
                                overflowX: "auto"
                            }}
                        >
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={tabStyle(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: "24px", minHeight: "200px" }}>
                            <h4 style={{ margin: "0 0 12px", color: "#111827", fontSize: "16px" }}>
                                {activeTab} Page Guide
                            </h4>
                            <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.6" }}>
                                {activeTab === "Home" && (
                                    <div>
                                        <p>
                                            To start your first simulation, click the{" "}
                                            <strong>Configure Scenario</strong> button!
                                        </p>
                                        <p>
                                            If you would like to load a previous scenario, click the{" "}
                                            <strong>Load</strong> button.
                                        </p>
                                        {/* <p> */}
                                        {/*     If you would like to compare different scenarios, click the{" "} */}
                                        {/*     <strong>Compare</strong> button. */}
                                        {/* </p> */}
                                    </div>
                                )}

                                {activeTab === "Configure" && (
                                    <div>
                                        <p>
                                            Use this page to define the parameters of your airport model and simulation
                                            settings.
                                        </p>
                                        <p>
                                            Define your model by adjusting the input parameters in the{" "}
                                            <strong> Traffic & Run Settings</strong> panel.
                                        </p>
                                        <p>
                                            To change the probabilities of natural emergencies, adjust it using
                                            environmental variables in the <strong>Events</strong> panel.
                                        </p>
                                        <p>
                                            {" "}
                                            To add scheduled closures or disruptions, use the{" "}
                                            <strong>Scheduled Runway Closures</strong> panel.
                                        </p>
                                        <p>
                                            {" "}
                                            To set up a configuration for each runway, use the{" "}
                                            <strong>Runway Configurations</strong> panel.
                                        </p>
                                        <p>
                                            Once you have finalized your configuration, click{" "}
                                            <strong>Go to Live Simulation</strong> to initialise the simulation engine.
                                        </p>
                                    </div>
                                )}

                                {activeTab === "Simulation" && (
                                    <div>
                                        <p>
                                            Click <strong> Start </strong> to watch your simulation unfold in real-time
                                            through the live viewport.
                                        </p>
                                        <p>
                                            You can use the playback controls to <strong> Pause or Resume</strong> the
                                            simulation.
                                        </p>
                                        <p>
                                            To adjust the speed, you can click one the speed controls{" "}
                                            <strong>1x, 2x, 4x, 8x</strong>. Alternatively, you can skip the simulation
                                            by clicking <strong> Finish now </strong>.{" "}
                                        </p>
                                        <p>
                                            Once you have finished running the simulation, click{" "}
                                            <strong> View Results </strong> to view the calculated outputs and data
                                            visualisations.
                                        </p>
                                    </div>
                                )}

                                {activeTab === "Results" && (
                                    <div>
                                        <p>
                                            Use this page to analyse the completed run through detailed data
                                            visualisations and performance metrics.
                                        </p>
                                        <p>
                                            To generate a portable document of these findings, click the{" "}
                                            <strong>Export PDF</strong> button.
                                        </p>
                                        <p>
                                            If you want to keep this simulation for future benchmarking, click{" "}
                                            <strong>Save to Database</strong>.
                                        </p>
                                        <p>
                                            To clear the current data and build a different model from scratch, click{" "}
                                            <strong>New Scenario</strong>.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: "16px", textAlign: "right", background: "#f9fafb" }}>
                            <button
                                onClick={() => setHelpOpen(false)}
                                style={{
                                    padding: "8px 24px",
                                    backgroundColor: "#185FA5",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: 500
                                }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HelpManual;
