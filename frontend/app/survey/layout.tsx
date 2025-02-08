import React from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { StyledEngineProvider } from "@mui/material/styles";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Survey",
  description: "Call to action survey for first time users.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <StyledEngineProvider injectFirst>
        <body className={`${inter.className} min-h-screen`}>{children}</body>
      </StyledEngineProvider>
    </html>
  );
}
