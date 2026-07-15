import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lesson Plan Generator",
  description: "Generate complete classroom-ready lesson plans aligned to selected standards."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
