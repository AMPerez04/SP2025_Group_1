import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/zustand/store";

export function AssetInfo() {
  //   const { selectedAsset } = useStore((state) => state);
  const selectedAsset = {
    name: "AAPL",
    previousClose: "212.69",
    open: "214.22",
    bid: "214.81 x 300",
    ask: "214.93 x 300",
    daysRange: "213.91 - 218.76",
    week52Range: "164.08 - 260.10",
    volume: "23,614,933",
    averageVolume: "53,123,005",
    marketCap: "3.228T",
    beta: "1.18",
    peRatio: "34.10",
    eps: "6.30",
    earningsDate: "Apr 30, 2025 - May 5, 2025",
    dividendYield: "1.00 (0.47%)",
    exDividendDate: "Feb 10, 2025",
    targetEst: "252.59",
  };

  if (!selectedAsset) return null;

  const assetInfo = [
    { label: "Previous Close", value: selectedAsset.previousClose },
    { label: "Open", value: selectedAsset.open },
    { label: "Bid", value: selectedAsset.bid },
    { label: "Ask", value: selectedAsset.ask },
    { label: "Day's Range", value: selectedAsset.daysRange },
    { label: "52 Week Range", value: selectedAsset.week52Range },
    { label: "Volume", value: selectedAsset.volume },
    { label: "Avg. Volume", value: selectedAsset.averageVolume },
    { label: "Market Cap (intraday)", value: selectedAsset.marketCap },
    { label: "Beta (5Y Monthly)", value: selectedAsset.beta },
    { label: "PE Ratio (TTM)", value: selectedAsset.peRatio },
    { label: "EPS (TTM)", value: selectedAsset.eps },
    { label: "Earnings Date", value: selectedAsset.earningsDate },
    { label: "Forward Dividend & Yield", value: selectedAsset.dividendYield },
    { label: "Ex-Dividend Date", value: selectedAsset.exDividendDate },
    { label: "1Y Target Est", value: selectedAsset.targetEst },
  ];

  const columns = 3; // default num columns
  const rows = Math.ceil(assetInfo.length / columns);
  const gridItems = Array.from({ length: rows }, (_, rowIndex) =>
    assetInfo.filter((_, index) => index % rows === rowIndex)
  ).flat();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{selectedAsset.name} Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          {gridItems.map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between border-b border-dashed pb-1"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AssetInfo;
