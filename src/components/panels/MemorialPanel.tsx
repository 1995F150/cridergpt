
import React from "react";
import { DedicationMessage } from "@/components/DedicationMessage";

export function MemorialPanel() {
  React.useEffect(() => {
    // Dynamically load the font (if not already loaded globally)
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css?family=Great+Vibes&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="p-8">
      <DedicationMessage />
      <div className="flex items-center justify-center min-h-full">
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            maxWidth: 520,
            margin: "3rem auto",
            boxShadow: "0 4px 28px #0002",
            textAlign: "center",
            border: "2px solid #ededed",
          }}
        >
          <h1
            style={{
              fontSize: "2.7rem",
              fontFamily: "'Great Vibes', cursive",
              color: "#222",
              marginBottom: "0.25rem",
              fontWeight: "normal",
            }}
          >
            In Loving Memory
          </h1>
          <h2
            style={{
              fontSize: "2rem",
              fontFamily: "'Great Vibes', cursive",
              color: "#871818",
              marginBottom: "1.2rem",
              fontWeight: "normal",
              letterSpacing: "1px",
            }}
          >
            Jerry Blankenship
          </h2>
          <div
            style={{
              fontSize: "1.3rem",
              fontFamily: "'Great Vibes', cursive",
              color: "#4d4d4d",
              marginTop: "1.2rem",
              lineHeight: 1.5,
            }}
          >
            Your memory will live on in our stories and love.<br />
            Rest easy, Uncle Jerry.
          </div>
        </div>
      </div>
    </div>
  );
}
