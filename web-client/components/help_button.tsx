"use client";
import React, { useState } from "react";

const HelpManual = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");

  const tabs = ["Home", "Configure", "Simulation", "Results", "Compare"];

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    borderRadius: '6px',
    background: activeTab === id ? '#185FA5' : 'transparent',
    color: activeTab === id ? '#fff' : '#6b7280',
    transition: '0.2s',
    whiteSpace: 'nowrap'
  });

  return (
    <>
      {/* Floating Help Button */}
      <button 
        onClick={() => setHelpOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          // Adjusted these styles for text instead of an icon
          padding: '0 20px', 
          height: '44px', 
          borderRadius: '22px', 
          backgroundColor: '#185FA5', color: 'white', border: 'none',
          cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999
        }}
      >
        Help
      </button>

      {/* Manual Pop-up Window */}
      {helpOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px', fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '500px',
            width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden', border: '1px solid #e5e7eb'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Instructions Manual</h2>
              <button onClick={() => setHelpOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
            </div>

            <div style={{ 
              display: 'flex', gap: '4px', padding: '8px 12px', 
              background: '#f9fafb', borderBottom: '1px solid #f3f4f6',
              overflowX: 'auto'
            }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', minHeight: '200px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#111827', fontSize: '16px' }}>{activeTab} Page Guide</h4>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                {activeTab === 'Home' && <p>Dashboard overview text goes here.</p>}
                {activeTab === 'Configure' && <p>Instructions for setting up parameters.</p>}
                {activeTab === 'Simulation' && <p>How to monitor the live simulation.</p>}
                {activeTab === 'Results' && <p>Interpreting the data and graphs.</p>}
                {activeTab === 'Compare' && <p>How to benchmark different runs.</p>}
              </div>
            </div>

            <div style={{ padding: '16px', textAlign: 'right', background: '#f9fafb' }}>
              <button 
                onClick={() => setHelpOpen(false)}
                style={{
                  padding: '8px 24px', backgroundColor: '#185FA5', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
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