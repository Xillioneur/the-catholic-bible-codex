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
          backgroundColor: "#1E3A8A",
          backgroundImage: "radial-gradient(circle at center, #2563EB 0%, #1E3A8A 100%)",
          color: "white",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "60px",
            padding: "80px",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            width: "1000px",
          }}
        >
          {/* Logo Cross */}
          <div style={{ display: "flex", marginBottom: "40px" }}>
            <svg width="100" height="100" viewBox="0 0 32 32" fill="none">
              <path d="M16 4V28" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M9 12H23" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: "84px",
              fontWeight: "900",
              textAlign: "center",
              letterSpacing: "-0.04em",
              marginBottom: "10px",
              lineHeight: 1.1,
            }}
          >
            Verbum Domini
          </div>

          {/* Sub-headline */}
          <div
            style={{
              fontSize: "36px",
              fontWeight: "500",
              opacity: 0.9,
              textAlign: "center",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "60px",
            }}
          >
            Catholic Bible Codex
          </div>

          {/* Call to Action */}
          <div
            style={{
              display: "flex",
              backgroundColor: "white",
              color: "#1E3A8A",
              padding: "20px 50px",
              borderRadius: "100px",
              fontSize: "28px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
          >
            Start Reading Now
          </div>
        </div>

        {/* Footer info */}
        <div style={{ position: "absolute", bottom: "40px", fontSize: "20px", opacity: 0.6, letterSpacing: "0.1em" }}>
          THE COMPLETE CATHOLIC CANON • OFFLINE-FIRST
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
