"use client";

import React, { useState } from 'react';
{/*
  - Allow user to configure the runways.
*/}


const Configure: React.FC = () => {
  const [formData, setFormData] = useState({
    inboundFlow: '',
    outboundFlow: '',
    numRuns: '',
    seed: '',
    runways: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoadScenario = () => {
    console.log('Loading Scenario with data:', formData);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Header Section */}
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Configure Scenario</h1>
        <p style={{ color: '#555' }}>Create a scenario by editing variables, save a scenario, or load a saved scenario</p>
      </header>

      {/* Load Scenario Button */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <button 
          onClick={handleLoadScenario}
          style={{ padding: '10px 30px', cursor: 'pointer', fontSize: '16px' }}
        > 
          Load Scenario 
        </button>
      </div>

      {/* Main Grid*/}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        
        {/* Left Column */}
        <section>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Traffic & Run Settings</h2>
          
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Inbound flow per hour</label>
              <input
                type="number"
                name="inboundFlow"
                value={formData.inboundFlow}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Outbound flow per hour</label>
              <input
                type="number"
                name="outboundFlow"
                value={formData.outboundFlow}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>No. of runs</label>
              <input
                type="number"
                name="numRuns"
                value={formData.numRuns}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Seed</label>
              <input
                type="text"
                name="seed"
                value={formData.seed}
                onChange={handleChange}
                placeholder="Optional"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
          </div>
        </section>

        {/* Right Column */}
        <section>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Runway Settings</h2>
          
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>No. of available runways</label>
              <input
                type="number"
                name="runways"
                value={formData.runways}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Configure;