import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A", // Deep Midnight Blue
          backgroundImage: "radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)",
          color: "white",
          padding: "40px",
        }}
      >
        {/* The Golden Border - Inspired by the measured walls of Jerusalem */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #EAB308", // Celestial Gold
            borderRadius: "4px",
            padding: "60px",
            width: "1120px",
            height: "550px",
            position: "relative",
          }}
        >
          {/* Decorative Corner Accents */}
          <div style={{ position: "absolute", top: "-10px", left: "-10px", width: "40px", height: "40px", borderTop: "4px solid #EAB308", borderLeft: "4px solid #EAB308" }} />
          <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "40px", height: "40px", borderTop: "4px solid #EAB308", borderRight: "4px solid #EAB308" }} />
          <div style={{ position: "absolute", bottom: "-10px", left: "-10px", width: "40px", height: "40px", borderBottom: "4px solid #EAB308", borderLeft: "4px solid #EAB308" }} />
          <div style={{ position: "absolute", bottom: "-10px", right: "-10px", width: "40px", height: "40px", borderBottom: "4px solid #EAB308", borderRight: "4px solid #EAB308" }} />

          {/* The Cross of Light */}
          <div style={{ display: "flex", marginBottom: "40px" }}>
            <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
              <path d="M16 2V30" stroke="#EAB308" strokeWidth="2" strokeLinecap="square" />
              <path d="M8 10H24" stroke="#EAB308" strokeWidth="2" strokeLinecap="square" />
            </svg>
          </div>

          {/* Official Name */}
          <div
            style={{
              fontSize: "96px",
              fontWeight: "900",
              textAlign: "center",
              letterSpacing: "-0.02em",
              color: "white",
              lineHeight: 1,
              marginBottom: "60px",
            }}
          >
            The Catholic Bible Codex
          </div>

          {/* Improved CTA - Stronger and Cleaner */}
          <div
            style={{
              display: "flex",
              backgroundColor: "white",
              color: "#0F172A",
              padding: "20px 60px",
              borderRadius: "4px",
              fontSize: "24px",
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            Open the Word
          </div>
        </div>

        {/* Biblical Order Info */}
        <div style={{ position: "absolute", bottom: "60px", fontSize: "14px", color: "white", opacity: 0.4, letterSpacing: "0.3em", fontWeight: "bold" }}>
          73 BOOKS • COMPLETE CANON • OFFLINE-FIRST
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
