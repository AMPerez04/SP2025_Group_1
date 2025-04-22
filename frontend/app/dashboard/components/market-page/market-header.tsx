"use client";

import React from "react";
import { useStore } from "@/zustand/store";

const marketNames: Record<string, string> = {
  NASDAQ: "National Association of Securities Dealers Automated Quotations",
  NYSE: "New York Stock Exchange",
  AMEX: "American Stock Exchange",
};

export default function MarketHeader() {
  const { selectedMarket } = useStore((state) => state);

  if (!selectedMarket) return <></>;

  return (
    <div className="p-8 bg-background rounded-xl shadow-xl border border-b-4 text-center mb-4 w-full max-w-xl">
      <h1 className="text-5xl font-bold mb-3">{selectedMarket}</h1>
      <p className="text-muted-foreground text-sm italic">
        {marketNames[selectedMarket]}
      </p>
    </div>
  );
}
