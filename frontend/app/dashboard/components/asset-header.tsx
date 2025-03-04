import React, { useEffect } from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/zustand/store";

export default function AssetHeader() {
  const { isMarketOpen, getMarketStatus, selectedAsset } = useStore(
    (state) => state
  );

  const getNext30MinMark = (): Date => {
    const now = new Date();
    const minutes = now.getMinutes();

    // update to next 30-min mark
    const next30MinMark = minutes < 30 ? 30 : 60; // next 30-min mark (HH:30 or HH:00)
    const nextUpdateTime = new Date(now);
    nextUpdateTime.setMinutes(next30MinMark, 0, 0);

    if (next30MinMark === 60) {
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

  const marketStatus = isMarketOpen ? "Market is Open" : "Market is Closed";

  if (!selectedAsset) {
    return <></>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between p-6 bg-background rounded-xl shadow-xl border border-b-4">
        <div className="flex items-center space-x-4">
          <div className="max-w-[120px] max-h-[120px] rounded-full bg-black flex items-center justify-center p-6">
            <Image
              src={selectedAsset.assetLogo}
              alt={selectedAsset.companyName}
              width={120}
              height={120}
              priority
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-3xl font-semibold mb-3">
              {selectedAsset.companyName}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded-lg">
                {selectedAsset.ticker}
              </span>
              <span>•</span>
              <div className="flex items-center gap-x-3 bg-muted px-4 py-1 rounded-lg">
                <Image
                  src={selectedAsset.marketLogo}
                  alt={selectedAsset.marketName}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                <span>{selectedAsset.marketName}</span>
                <Tooltip delayDuration={15}>
                  <TooltipTrigger asChild>
                    <span className="relative flex items-center">
                      {isMarketOpen && (
                        <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-500 opacity-75 animate-ping"></span>
                      )}
                      <span
                        className={`w-3 h-3 rounded-full ${
                          isMarketOpen ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-muted text-sm text-muted-foreground h-7 flex items-center"
                  >
                    {marketStatus}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
