"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface CompareButtonProps {
  label?: React.ReactNode;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function CompareButton({ style, children, label }: CompareButtonProps) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: '#fff', padding: '30px', borderRadius: '8px', width: '480px', maxHeight: '80vh', overflowY: 'auto',
    fontFamily: 'sans-serif'
  };

  const handleOpenPicker = async () => {
    try {
      const res = await fetch('http://localhost:3000/history');
      const json = await res.json();
      // Ensure we are accessing the data array correctly from your backend
      const sortedData = json.data ? [...json.data].reverse() : [];
      setHistory(sortedData);
      setShowPicker(true);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else if (selectedIds.length < 2) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompareGo = () => {
    if (selectedIds.length === 2) {
      router.push(`/compare?idA=${selectedIds[0]}&idB=${selectedIds[1]}`);
    }
  };

  return (
    <>
      <button 
        style={{ ...style, cursor: 'pointer', fontFamily: 'inherit' }} 
        onClick={handleOpenPicker}
      >
        {children || label || "Compare"}
      </button>

      {showPicker && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, color: TEXT }}>Compare Scenarios</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Select 2 scenarios to compare
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '10px 0' }}>
              {history.map((sim) => {
                const isSelected = selectedIds.includes(sim.id);
                // Map the data exactly like your Results page does
                const config = sim.configurationUsed || {};

                return (
                  <div 
                    key={sim.id} 
                    onClick={() => toggleSelection(sim.id)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${isSelected ? DS_BLUE : BORDER}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f7ff' : '#fff',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: TEXT }}>
                        {sim.name || `Scenario ${sim.id.slice(0,5)}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        <div style={{ fontSize: '12px', color: '#888' }}>{new Date(sim.timestamp).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* STATS PREVIEW: Matches your Results page layout */}
                    {isSelected && (
                      <div style={{ 
                        marginTop: '10px', 
                        paddingTop: '10px', 
                        borderTop: `1px solid ${BORDER}`,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        fontSize: '12px',
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
                onClick={handleCompareGo} 
                disabled={selectedIds.length !== 2}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  background: selectedIds.length === 2 ? DS_BLUE : '#ccc',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: selectedIds.length === 2 ? 'pointer' : 'not-allowed'
                }}
              >
                Compare Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}