import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "40px",
            padding: "60px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 32 32"
            fill="none"
            style={{ marginBottom: "40px" }}
          >
            <path
              d="M16 4V28"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M9 12H23"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "900",
              textAlign: "center",
              letterSpacing: "-0.05em",
              marginBottom: "20px",
            }}
          >
            Catholic Bible Codex
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "500",
              opacity: 0.8,
              textAlign: "center",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Verbum Domini
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
