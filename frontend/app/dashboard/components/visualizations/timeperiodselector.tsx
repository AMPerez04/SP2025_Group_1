import React, { useEffect, useState } from 'react';
import { useStore } from '../../../../zustand/store';
import { cn, Period, Interval, periodIntervalMap } from "@/lib/utils";

interface TimePeriodSelectorProps {
  hasCandleOption: boolean;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ hasCandleOption }) => {
  const selectedPeriod = useStore((state) => state.selectedPeriod as Period);
  const setSelectedPeriod = useStore((state) => state.setSelectedPeriod);

  const selectedInterval = useStore((state) => state.selectedInterval);
  const setSelectedInterval = useStore((state) => state.setSelectedInterval);

  // New chart type state (assume type is "area" | "candle")
  const chartType = useStore((state) => state.chartType);
  const setChartType = useStore((state) => state.setChartType);

  const [validIntervals, setValidIntervals] = useState<Interval[]>(() => [
    ...periodIntervalMap[selectedPeriod],
  ]);

  useEffect(() => {
    setValidIntervals([...periodIntervalMap[selectedPeriod]]);
    if (!periodIntervalMap[selectedPeriod].includes(selectedInterval)) {
      setSelectedInterval(periodIntervalMap[selectedPeriod][0]);
    }
  }, [selectedPeriod, selectedInterval, setSelectedInterval]);

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
  };

  const handleIntervalChange = (interval: Interval) => {
    setSelectedInterval(interval);
  };

  return (
    <div className="flex justify-between items-start w-full">
      {/* Left side: Period + Interval selectors */}
      <div className="flex flex-col space-y-4">
        {/* Time Period Selector */}
        <div>
          <div className="flex space-x-0.5">
            {Object.keys(periodIntervalMap).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period as Period)}
                className={cn(
                  "w-24 px-4 py-2 border-c last:border-0 text-center",
                  selectedPeriod === period
                    ? "bg-gray-500 rounded text-white"
                    : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <hr className="my-1 border-gray-300" />

        {/* Interval Selector */}
        <div>
          <div className="flex space-x-0.5">
            {validIntervals.map((interval) => (
              <button
                key={interval}
                onClick={() => handleIntervalChange(interval)}
                className={cn(
                  "w-24 px-4 py-2 border-c last:border-0 text-center",
                  selectedInterval === interval
                    ? "bg-gray-500 rounded text-white"
                    : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
                )}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Chart Type Selector */}
      {hasCandleOption && (
      <div className="flex space-x-0.5">
        <button
          onClick={() => setChartType("area")}
          className={cn(
            "w-24 px-4 py-2 border-c last:border-0 text-center",
            chartType === "area"
              ? "bg-gray-500 rounded text-white"
              : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
          )}
        >
          Area
        </button>
        <button
          onClick={() => setChartType("candle")}
          className={cn(
            "w-24 px-4 py-2 border-c last:border-0 text-center",
            chartType === "candle"
              ? "bg-gray-500 rounded text-white"
              : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
          )}
        >
          Candle
        </button>
      </div>
      )}
    </div>
  );
};

export default TimePeriodSelector;
