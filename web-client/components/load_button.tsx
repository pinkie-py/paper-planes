"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface LoadButtonProps {
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function LoadButton({ style, children }: LoadButtonProps) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleOpenPicker = async () => {
    try {
      const res = await fetch('http://localhost:3000/history');
      const json = await res.json();
      const sortedData = json.data ? [...json.data].reverse() : [];
      setHistory(sortedData);
      setShowPicker(true);
      setSelectedId(null);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleViewResults = () => {
    if (selectedId) {
      router.push(`/results?id=${selectedId}`);
      setShowPicker(false);
    }
  };

  const handleRunNew = () => {
    if (selectedId) {
      const selectedSim = history.find(s => s.id === selectedId);
      if (selectedSim && selectedSim.configurationUsed) {
        sessionStorage.setItem("pp:simConfig", JSON.stringify(selectedSim.configurationUsed));
        router.push(`/simulation`);
      }
      setShowPicker(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleOpenPicker} 
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', ...style }}
      >
        {children || "Load Scenario"}
      </button>

      {showPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto', fontFamily: 'sans-serif' }}>
            <h3 style={{ marginTop: 0, color: TEXT }}>Load Scenario</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              {selectedId ? "1 of 1 selected" : "Select a scenario to load"}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '10px 0' }}>
              {history.map((sim) => {
                const isSelected = selectedId === sim.id;
                return (
                  <div 
                    key={sim.id} 
                    onClick={() => setSelectedId(isSelected ? null : sim.id)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${isSelected ? DS_BLUE : BORDER}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f7ff' : '#fff',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header: Name on Left, Time on Right */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: TEXT }}>
                        {sim.name || `Scenario ${sim.id.slice(0,5)}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(sim.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div style={{ 
                        marginTop: '10px', 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        fontSize: '12px', 
                        borderTop: `1px solid ${BORDER}`, 
                        paddingTop: '10px',
                        gap: '6px',
                        color: '#4b5563'
                      }}>
                        <div>Inbound: <b>{sim.configurationUsed.inboundFlowRate}</b></div>
                        <div>Outbound: <b>{sim.configurationUsed.outboundFlowRate}</b></div>
                        <div>Runways: <b>{sim.configurationUsed.runways.length}</b></div>
                        <div>Runs: <b>{sim.configurationUsed.runCount}</b></div>
                        <div> Seed: <b>{sim.configurationUsed.seed ?? "Auto"}</b></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setShowPicker(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontWeight: 600 }}
              >
                Cancel
              </button>
              
              <button 
                onClick={handleViewResults} 
                disabled={!selectedId}
                style={{ 
                    padding: '10px 15px',
                    borderRadius: '6px',
                    background: selectedId ? DS_BLUE : '#ccc',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: selectedId ? 'pointer' : 'not-allowed'
                }}
              >
                View Previous Results
              </button>

              <button 
                onClick={handleRunNew} 
                disabled={!selectedId}
                style={{
                  padding: '10px 15px',
                  borderRadius: '6px',
                  background: selectedId ? DS_BLUE : '#ccc',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: selectedId ? 'pointer' : 'not-allowed'
                }}
              >
                Generate New Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}