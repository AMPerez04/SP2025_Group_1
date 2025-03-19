import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/zustand/store";

export function AssetInfo() {
  const { selectedAsset, quoteData, getQuote } = useStore((state) => state);

  useEffect(() => {
    if (selectedAsset) {
      getQuote(selectedAsset.ticker);
    }
  }, [selectedAsset, getQuote]);

  if (!selectedAsset || !quoteData) return <></>;

  const assetInfo = [
    { label: "Previous Close", value: quoteData.previousClose },
    { label: "Open", value: quoteData.open },
    { label: "Bid", value: quoteData.bid },
    { label: "Ask", value: quoteData.ask },
    { label: "Day's Range", value: quoteData.daysRange },
    { label: "52 Week Range", value: quoteData.week52Range },
    { label: "Volume", value: quoteData.volume },
    { label: "Avg. Volume", value: quoteData.averageVolume },
    { label: "Market Cap (Intraday)", value: quoteData.marketCap },
    { label: "Beta (5Y Monthly)", value: quoteData.beta },
    { label: "PE Ratio (TTM)", value: quoteData.peRatio },
    { label: "EPS (TTM)", value: quoteData.eps },
    { label: "Earnings Date", value: quoteData.earningsDate },
    { label: "Forward Dividend & Yield", value: quoteData.dividendYield },
    { label: "Ex-Dividend Date", value: quoteData.exDividendDate },
    { label: "1Y Target Est", value: quoteData.targetEst },
  ];

  const ROW_LENGTH = 3;
  const columnCount = Math.ceil(assetInfo.length / ROW_LENGTH);
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
    return assetInfo.filter((_, index) => index % columnCount === columnIndex);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{selectedAsset.ticker} Quote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          {Array.from({ length: ROW_LENGTH }, (_, rowIndex) => (
            <div key={rowIndex} className="flex flex-col gap-y-3">
              {columns.map((column, colIndex) => {
                const item = column[rowIndex];
                return (
                  item && (
                    <div
                      key={`${colIndex}-${rowIndex}`}
                      className="flex justify-between border-b border-dashed pb-1 mb-1"
                    >
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  )
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AssetInfo;
