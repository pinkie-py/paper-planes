"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Define the interface for the props
interface CompareButtonProps {
  style?: React.CSSProperties;
}

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function CompareButton({ style }: CompareButtonProps) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Internal styles for the modal (these stay inside)
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: '#fff', padding: '30px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto'
  };

  const handleOpenPicker = async () => {
    try {
      const res = await fetch('http://localhost:3000/history');
      const json = await res.json();
      
      // Reverse the data so the newest entries are at the top
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
      <button style={style} onClick={handleOpenPicker}>
        Compare Scenarios
      </button>

      {showPicker && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, color: TEXT }}>Select 2 Scenarios</h3>
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
                  <div style={{ fontWeight: 'bold', color: TEXT }}>{sim.name || `Sim ${sim.id.slice(0,5)}`}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{new Date(sim.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPicker(false)} style={{ ...style, width: 'auto' }}>Cancel</button>
              <button 
                onClick={handleCompareGo} 
                disabled={selectedIds.length !== 2}
                style={{
                  ...style, 
                  width: 'auto', 
                  background: selectedIds.length === 2 ? DS_BLUE : '#ccc',
                  color: '#fff',
                  border: 'none',
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