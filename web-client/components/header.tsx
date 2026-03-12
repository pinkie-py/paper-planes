"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import CompareButton from "./compare_button";

import { usePathname } from "next/navigation";

const DS_BLUE = "#004696";
const TEXT = "#1f2937";
const BORDER = "#d0d7de";

export default function header() {
  const pathname = usePathname(); // This detects which page you are on

  const navLinkStyle = (path: string): React.CSSProperties => ({
    padding: "10px 14px",
    textDecoration: "none",
    color: pathname === path ? "#fff" : TEXT,
    background: pathname === path ? DS_BLUE : "transparent",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    transition: "0.2s",


    border: "none",            // Removes the default black outline
    cursor: "pointer",         // Makes it feel like a link
    fontFamily: "inherit",     // Prevents the button from using a different font
  });

  return (
    <header style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/logo1.png"
            alt="Paper Planes logo"
            width={38}
            height={38}
            style={{ borderRadius: 8, objectFit: "contain" }}
          />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, color: DS_BLUE }}>Paper Planes</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Airport simulation</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={navLinkStyle("/")}>Home</Link>
          <Link href="/configure" style={navLinkStyle("/configure")}>Configure</Link>
          <Link href="/results" style={navLinkStyle("/results")}>Results</Link>
          <CompareButton style={navLinkStyle("/compare")}>
            Compare
          </CompareButton>
        </nav>
      </div>
    </header>
  );
}