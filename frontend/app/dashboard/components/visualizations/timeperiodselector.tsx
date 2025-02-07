import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../../../zustand/store';
import { cn } from "@/lib/utils"; // Assuming you have a cn utility

const TimePeriodSelector: React.FC = () => {
  const selectedPeriod = useStore((state) => state.selectedPeriod);
  const setSelectedPeriod = useStore((state) => state.setSelectedPeriod);

  const selectedInterval = useStore((state) => state.selectedInterval);
  const setSelectedInterval = useStore((state) => state.setSelectedInterval);

  const periodIntervalMap = useMemo(() =>({
    "1d": ["1m", "5m", "15m", "30m", "1h"],
    "5d": ["5m", "15m", "30m", "1h"],
    "1mo": ["1h", "1d"],
    "3mo": ["1d", "1wk"],
    "6mo": ["1d", "1wk"],
    "1y": ["1d", "1wk", "1mo"],
    "2y": ["1wk", "1mo"],
    "5y": ["1wk", "1mo"],
    "10y": ["1mo"],
    "ytd": ["1d", "1wk"],
    "max": ["1mo"]
  }),[]);

  const [validIntervals, setValidIntervals] = useState<string[]>(periodIntervalMap[selectedPeriod]);

  useEffect(() => {
    setValidIntervals(periodIntervalMap[selectedPeriod]);
    if (!periodIntervalMap[selectedPeriod].includes(selectedInterval)) {
      setSelectedInterval(periodIntervalMap[selectedPeriod][0]);
    }
  }, [selectedPeriod,periodIntervalMap,selectedInterval,setSelectedInterval]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleIntervalChange = (interval: string) => {
    setSelectedInterval(interval);
  };

  return (
    <div className="flex flex-col space-y-4 max-w-lg ml-0">
      {/* Time Period Selector */}
      <div>
        <div className="flex space-x-0.5">
          {Object.keys(periodIntervalMap).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={cn(
                "w-24 px-4 py-2 border-c last:border-0 text-center",
                selectedPeriod === period
                  ? "bg-sidebar-accent text-white"
                  : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

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
                  ? "bg-sidebar-accent text-white"
                  : "bg-transparent text-gray-500 hover:bg-sidebar-hover"
              )}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimePeriodSelector;