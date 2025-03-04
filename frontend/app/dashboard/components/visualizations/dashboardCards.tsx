import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  // BarChart2,
} from "lucide-react";
import { useStore } from "@/zustand/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const intervalMap: Record<string, string> = {
  "1m": "minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "hour",
  "1d": "day",
  "1wk": "week",
  "1mo": "month",
};

const periodMap: Record<string, string> = {
  "1d": "day",
  "5d": "5 days",
  "1mo": "month",
  "3mo": "3 months",
  "6mo": "6 months",
  "1y": "year",
  "2y": "2 years",
  "5y": "5 years",
  "10y": "10 years",
  ytd: "year to date",
  max: "maximum period",
};

const DashboardCards: React.FC = () => {
  // Split into separate selectors to avoid object creation
  const selectedInterval = useStore((state) => state.selectedInterval);
  const selectedPeriod = useStore((state) => state.selectedPeriod);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const financialData = useStore((state) => state.financialData);
  // Get the current price (last price in the financial data)
  const getCurrentPrice = () => {
    if (!selectedAsset || !financialData[selectedAsset.ticker]) {
      return "0.00";
    }
    const data = financialData[selectedAsset.ticker];
    const lastPrice = data[data.length - 1].value;
    return lastPrice.toFixed(2);
  };

  // Calculate price change percentage
  const getPriceChangeSinceLastInterval = () => {
    if (!selectedAsset || !financialData[selectedAsset.ticker]) {
      return { priceChange: "0.00", changePercent: "0.00" };
    }
    const data = financialData[selectedAsset.ticker];
    const currentPrice = data[data.length - 1].value;
    const previousPrice = data[data.length - 2]?.value ?? currentPrice;
    const priceChange = currentPrice - previousPrice;
    const changePercent = (priceChange / previousPrice) * 100;
    return {
      priceChange: priceChange.toFixed(2),
      changePercent: changePercent.toFixed(2),
    };
  };
  const getPriceChangeSincePeriod = () => {
    if (!selectedAsset || !financialData[selectedAsset.ticker]) {
      return { priceChange: "0.00", changePercent: "0.00" };
    }
    const data = financialData[selectedAsset.ticker];
    const currentPrice = data[data.length - 1].value;
    const initialPrice = data[0]?.value ?? currentPrice;
    const priceChange = currentPrice - initialPrice;
    const changePercent = (priceChange / initialPrice) * 100;
    return {
      priceChange: priceChange.toFixed(2),
      changePercent: changePercent.toFixed(2),
    };
  };
  // const getVolumeChange = () => {
  //     if (!selectedAsset || !financialData[selectedAsset.ticker]) {
  //         return { priceChange: '0.00', changePercent: '0.00' };
  //     }
  //     const data = financialData[selectedAsset.ticker];
  //     const currentVolume = data[data.length - 1].volume;
  //     const previousVolume = data[data.length - 2]?.volume ?? currentVolume;
  //     const volumeChange = currentVolume - previousVolume;
  //     const changePercent = (volumeChange / previousVolume) * 100;
  //     return { volumeChange: volumeChange.toFixed(2), changePercent: changePercent.toFixed(2) };
  // };
  const getColor = (value: string) => {
    const num = parseFloat(value);
    if (num > 0) return "text-[#2d9c41]";
    if (num < 0) return "text-[#e22e29]";
    return "text-gray-500";
  };

  // Determine arrow symbol based on value
  const getArrow = (value: string) => {
    const num = parseFloat(value);
    if (num > 0) return "▲";
    if (num < 0) return "▼";
    return "";
  };

  // Determine icon based on value
  const getIcon = (value: number) => {
    if (value > 0)
      return <TrendingUp className="size-4 text-muted-foreground" />;
    if (value < 0)
      return <TrendingDown className="size-4 text-muted-foreground" />;
    return <TrendingUp className="size-4 text-muted-foreground" />;
  };
  const priceChangeLastInterval = getPriceChangeSinceLastInterval();
  const priceChangeSincePeriod = getPriceChangeSincePeriod();
  // const volumeChangeLastInterval = getVolumeChange();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current price</CardTitle>
          <DollarSign className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${getCurrentPrice()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Since last {intervalMap[selectedInterval]}
          </CardTitle>
          {getIcon(parseFloat(priceChangeLastInterval.priceChange))}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${getColor(
              priceChangeLastInterval.priceChange
            )}`}
          >
            {getArrow(priceChangeLastInterval.priceChange)}$
            {priceChangeLastInterval.priceChange}
          </div>
          <p className="text-xs text-muted-foreground">
            {priceChangeLastInterval.changePercent}%
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Over the past {periodMap[selectedPeriod]}
          </CardTitle>
          {getIcon(parseFloat(priceChangeSincePeriod.priceChange))}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${getColor(
              priceChangeSincePeriod.priceChange
            )}`}
          >
            {getArrow(priceChangeSincePeriod.priceChange)}$
            {priceChangeSincePeriod.priceChange}
          </div>
          <p className="text-xs text-muted-foreground">
            {priceChangeSincePeriod.changePercent}%
          </p>
        </CardContent>
      </Card>
      {/* <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Volume Change Since Last {selectedInterval}
                    </CardTitle>
                    {getIcon(volumeChangeLastInterval.volumeChange)}
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${getColor(volumeChangeLastInterval.volumeChange)}`}>
                        {volumeChangeLastInterval.volumeChange}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {volumeChangeLastInterval.changePercent}%
                    </p>
                </CardContent>
            </Card> */}
    </div>
  );
};

export default DashboardCards;
