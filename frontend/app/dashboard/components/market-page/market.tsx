"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MarketHeader from "./market-header";
import { useStore } from "@/zustand/store";
import {
  StockHeatmap,
  Exchanges,
  StockMarket,
} from "react-ts-tradingview-widgets";

export default function Market() {
  const { selectedMarket, isMarketOpen, getMarketStatus } = useStore(
    (state) => state
  );

  const getNext30MinMark = (): Date => {
    const now = new Date();
    const minutes = now.getMinutes();

    // update to next 30-min mark
    const nextUpdateTime = new Date(now);
    if (minutes < 30) {
      nextUpdateTime.setMinutes(31, 0, 0); // next update at hh:31:00
    } else {
      nextUpdateTime.setMinutes(1, 0, 0); // next update at hh+1:01:00
      nextUpdateTime.setHours(now.getHours() + 1);
    }

    return nextUpdateTime;
  };

  useEffect(() => {
    getMarketStatus();

    const nextUpdateTime = getNext30MinMark();
    const timeUntilNextUpdate = nextUpdateTime.getTime() - new Date().getTime();

    // wait until next 30-min mark --> then get market status every 30 min
    const timeout = setTimeout(() => {
      getMarketStatus();

      const interval = setInterval(() => {
        getMarketStatus();
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }, timeUntilNextUpdate);

    return () => clearTimeout(timeout);
  }, [getMarketStatus]);

  const marketStatus = isMarketOpen
    ? { status: "Open", message: "Trading is live", color: "text-green-600" }
    : { status: "Closed", message: "Trading is paused", color: "text-red-600" };

  if (!selectedMarket) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <MarketHeader />

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center justify-center text-center gap-1 py-5">
          <span className="text-muted-foreground text-sm uppercase tracking-wide w-full">
            Market Status
          </span>
          <span
            className={`text-2xl font-semibold w-full ${marketStatus.color}`}
          >
            {marketStatus.status}
          </span>
          <span className="text-sm text-gray-500 w-full">
            {marketStatus.message}
          </span>
        </CardContent>
      </Card>

      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Market Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <StockHeatmap
            // AMEX was acquired by NYSE in 2008
            exchanges={[
              selectedMarket === "AMEX"
                ? "NYSE"
                : (selectedMarket as Exchanges),
            ]}
            dataSource="SPX500"
            grouping="sector"
            blockSize="market_cap_basic"
            blockColor="change"
            locale="en"
            isZoomEnabled={true}
            colorTheme="light"
            height="100%"
          />
        </CardContent>
      </Card>
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Active Stocks</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <StockMarket // AMEX was acquired by NYSE in 2008
            exchange={
              selectedMarket === "AMEX"
                ? "NYSE"
                : (selectedMarket as "NASDAQ" | "NYSE")
            }
            showFloatingTooltip={true}
            plotLineColorGrowing="#00a63e"
            belowLineFillColorGrowing="#00a63e7f"
            belowLineFillColorGrowingBottom="#00a63e11"
            plotLineColorFalling="#e7000b"
            belowLineFillColorFalling="#e7000b7f"
            belowLineFillColorFallingBottom="#e7000b11"
            locale="en"
            colorTheme="light"
            width="100%"
          />
        </CardContent>
      </Card>
    </div>
  );
}
