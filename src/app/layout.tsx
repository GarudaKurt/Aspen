import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aspen",
  description: "Aspen represents connection, community, and a living ecosystem. Like an Aspen grove, where individual trees are connected through a shared root system, Aspen brings pet owners, veterinary clinics, and pet-service businesses together through one connected platform. Each business can grow independently while becoming part of a larger ecosystem that makes discovery, care, and digital growth easier.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
