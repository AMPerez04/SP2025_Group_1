import React from "react";
import AppInitializer from "./utils/AppInitializer";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
// import { StyledEngineProvider } from "@mui/material/styles";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProfitProphet",
  description:
    "Interactive dashboard to track real-time stock prices, trends, and market performance",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* <StyledEngineProvider injectFirst> */}
      <body className={`${inter.className} min-h-screen`}>
        <AppInitializer />
        <Toaster />
        {children}
      </body>
      {/* </StyledEngineProvider> */}
    </html>
  );
}
