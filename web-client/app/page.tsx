"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function HomePage() {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. Styles
  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    cursor: 'pointer',
    width: '200px',
    fontWeight: '600',
    background: '#fff',
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '4px'
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: '#fff', padding: '30px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto'
  };

  // 2. Fetch History from your NestJS backend
  const handleOpenPicker = async () => {
    try {
      const res = await fetch('http://localhost:3000/history'); // Adjust URL to your backend
      const json = await res.json();
      setHistory(json.data);
      setShowPicker(true);
    } catch (err) {
      console.error("Failed to load history", err);
      alert("Could not load simulation history.");
    }
  };

  // 3. Handle selection logic
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
    <div style={{ minHeight: "100vh", background: "#f6f8fb", fontFamily: 'sans-serif' }}>
      <Header />

      <div style={{ textAlign: 'center', padding: '20px' }}>
        <header style={{ marginTop: '20px' }}>
          <h1 style={{ color: DS_BLUE, margin: '0 0 10px' }}>Airport simulation</h1>
          <h2 style={{ fontWeight: '400', fontSize: '18px' }}>Home page</h2>
        </header>

        <main style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <Link href="/configure">
            <button style={buttonStyle}>Configure Scenario</button>
          </Link>

          <Link href="/results">
            <button style={buttonStyle}>Load Scenario</button>
          </Link>

          {/* CHANGED: Now triggers a function instead of a direct link */}
          <button style={buttonStyle} onClick={handleOpenPicker}>
            Compare Scenarios
          </button>
        </main>
      </div>

      {/* Selection Modal */}
      {showPicker && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Select 2 Scenarios to Compare</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>{selectedIds.length} of 2 selected</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              {history.map((sim) => (
                <div 
                  key={sim.id} 
                  onClick={() => toggleSelection(sim.id)}
                  style={{
                    padding: '10px',
                    border: `2px solid ${selectedIds.includes(sim.id) ? DS_BLUE : BORDER}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{sim.name || `Simulation ${sim.id.slice(0,5)}`}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{new Date(sim.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => {setShowPicker(false); setSelectedIds([]);}} style={{...buttonStyle, width: 'auto'}}>Cancel</button>
              <button 
                onClick={handleCompareGo} 
                disabled={selectedIds.length !== 2}
                style={{
                  ...buttonStyle, 
                  width: 'auto', 
                  background: selectedIds.length === 2 ? DS_BLUE : '#ccc',
                  color: '#fff',
                  border: 'none'
                }}
              >
                Compare Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}