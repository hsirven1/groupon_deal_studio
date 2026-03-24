import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groupon Deal Studio",
  description: "AI-assisted deal creation for local businesses."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
