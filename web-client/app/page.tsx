"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/header";

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
    borderRadius: '4px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: DS_BLUE,
    color: '#fff',
    border: 'none',
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
            <button style={buttonStyle}>
              Configure Scenario
            </button>
          </Link>

          <Link href="/results">
            <button style={buttonStyle}>
              Load Scenario
            </button>
          </Link>

          <Link href="/compare">
            <button style={buttonStyle}>
              Compare Scenario
            </button>
          </Link>
        </main>
      </div>
    </div>
  );
}