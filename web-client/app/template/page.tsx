"use client";

import React from "react";
import Header from "@/components/header";

// Theme Constants
const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function BlankTemplatePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", fontFamily: 'sans-serif', color: TEXT }}>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        

        <header style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: DS_BLUE, margin: 0 }}>
            Template Title
          </h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>

          </p>
        </header>


        <section style={{ 
          background: 'white', 
          padding: '24px', 
          border: `1px solid ${BORDER}`, 
          borderRadius: '8px',
          minHeight: '200px' 
        }}>
      
          <p>Text here</p>
        </section>

      </main>
    </div>
  );
}