import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Aspen business profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const businessName = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          color: "#3c6355",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "80px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 24 }}>Aspen</div>
        <div style={{ fontSize: 64, fontWeight: 700 }}>{businessName}</div>
        <div style={{ color: "#66736d", fontSize: 30, marginTop: 20 }}>
          Pet services and appointments
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
