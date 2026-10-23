import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ListingDraftAuthBoundary } from "@/features/business-profile/components/listing-draft-auth-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aspen | Find trusted pet services",
  description: "Find trusted pet services in Cebu, Manila and other cities.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ListingDraftAuthBoundary />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

