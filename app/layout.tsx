import type { Metadata } from "next";
import { Inter, Patrick_Hand } from "next/font/google"; // Import standard Google Fonts
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  weight: "400",
  variable: "--font-hand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloorSense - Intelligent Architectural Analysis",
  description: "Upload floor plans and get instant AI-powered detection of rooms, doors, and windows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${patrickHand.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
