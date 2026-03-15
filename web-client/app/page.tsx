"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/header";
import CompareButton from "@/components/compare_button";
import LoadButton from "@/components/load_button";
import HelpManual from "@/components/help_button";

export default function HomePage() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Home"); // Default tab

  const cardStyle = (id: string): React.CSSProperties => ({
    boxSizing: 'border-box',
    width: '100%',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderLeft: hovered === id ? '3px solid #185FA5' : '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    textAlign: 'left',
    boxShadow: hovered === id ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
    transform: hovered === id ? 'translateY(-1px)' : 'none',
    transition: 'all 0.15s ease',
  });

  const hoverProps = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
  });

  // Help Modal Tab Styles
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
    <div style={{ minHeight: '100vh', background: '#f6f8fb', fontFamily: 'sans-serif', position: 'relative' }}>
      <Header />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#111827', margin: '0 0 6px' }}>
            Airport simulation
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
            Home page
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/configure" style={cardStyle('configure')} {...hoverProps('configure')}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>Configure scenario</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Set up a new simulation from scratch</p>
            </div>
            <span style={{ color: '#9ca3af', fontSize: '18px' }}>›</span>
          </Link>

          <div {...hoverProps('load')} style={{ display: 'flex', borderRadius: '12px' }}>
            <LoadButton style={cardStyle('load')}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>Load scenario</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Open a previously saved simulation</p>
              </div>
              <span style={{ color: '#9ca3af', fontSize: '18px' }}>›</span>
            </LoadButton>
          </div>

          <div {...hoverProps('compare')} style={{ display: 'flex', borderRadius: '12px' }}>
            <CompareButton style={cardStyle('compare')}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>Compare scenarios</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Analyse results side by side</p>
              </div>
              <span style={{ color: '#9ca3af', fontSize: '18px' }}>›</span>
            </CompareButton>
          </div>
        </div>
      </div>
      <HelpManual />
    </div>
  );
}