"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/header";
import CompareButton from "@/components/compare_button";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function HomePage() {
  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    cursor: 'pointer',
    width: '200px',
    fontWeight: '600',
    background: '#fff',
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '4px',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    boxSizing: 'border-box',
    fontSize: '16px',
    fontFamily: 'sans-serif',
    transition: 'background 0.2s ease'
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", fontFamily: 'sans-serif' }}>
      <Header />

      <div style={{ textAlign: 'center', padding: '20px' }}>
        <header style={{ marginTop: '20px' }}>
          <h1 style={{ color: DS_BLUE, margin: '0 0 10px', fontSize: '32px' }}>
            Airport simulation
          </h1>
          <h2 style={{ fontWeight: '400', fontSize: '18px', color: '#4b5563' }}>
            Home page
          </h2>
        </header>

        <main 
          style={{ 
            marginTop: '40px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            alignItems: 'center' 
          }}
        >
          {/* Navigation Buttons */}
          <Link href="/configure" style={buttonStyle}>
            Configure Scenario
          </Link>

          <Link href="/results" style={buttonStyle}>
            Load Scenario
          </Link>

          <CompareButton style={buttonStyle} />
        </main>
      </div>
    </div>
  );
}