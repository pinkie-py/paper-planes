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
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', 
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: '#fff', 
    padding: '30px', 
    borderRadius: '8px', 
    width: '400px', 
    maxHeight: '80vh', 
    overflowY: 'auto',
    fontFamily: 'sans-serif'
  };

  const handleOpenPicker = async () => {
    try {
      const res = await fetch('http://localhost:3000/history');
      const json = await res.json();
      const sortedData = json.data ? [...json.data].reverse() : [];
      setHistory(sortedData);
      setShowPicker(true);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleSelectScenario = (id: string) => {
    router.push(`/results?id=${id}`);
    setShowPicker(false);
  };

  return (
    <>
      <button 
        onClick={handleOpenPicker}
        style={{
          // Default resets to prevent "the box" in the header
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
            color: 'inherit',
          ...style 
        }}
      >
        {children || "Load Scenario"}
      </button>

      {showPicker && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, color: TEXT }}>Select a Scenario to Load</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              {history.length > 0 ? (
                history.map((sim) => (
                  <div 
                    key={sim.id} 
                    onClick={() => handleSelectScenario(sim.id)}
                    style={{
                      padding: '12px',
                      border: `1px solid ${BORDER}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: '0.2s',
                      background: '#fff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = DS_BLUE;
                      e.currentTarget.style.backgroundColor = '#f0f7ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = BORDER;
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: TEXT }}>
                      {sim.name || `Scenario ${sim.id.slice(0, 5)}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(sim.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#888', textAlign: 'center' }}>No history found.</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowPicker(false)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#666', 
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}