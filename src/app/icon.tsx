import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "warevance-logo-transparent.png"
  );

  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "64px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={270}
          height={90}
          style={{
            width: "270px",
            height: "90px",
            maxWidth: "none",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      </div>
    ),
    size
  );
}
