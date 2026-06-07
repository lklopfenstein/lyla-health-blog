import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { TrafficTracker } from "@/components/TrafficTracker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "Lyla Klopfenstein",
  description: "Updates, photos, and notes from Lyla Klopfenstein's health journey.",
  openGraph: {
    title: "Lyla Klopfenstein",
    description: "Updates, photos, and notes from Lyla Klopfenstein's health journey.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable}`}>
        <TrafficTracker />
        {children}
      </body>
    </html>
  );
}
