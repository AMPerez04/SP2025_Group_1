import React, { useEffect, useState } from 'react';
import { useStore } from '../../../../zustand/store';
import { cn, Period, Interval, periodIntervalMap } from "@/lib/utils";


const TimePeriodSelector: React.FC = () => {
  const selectedPeriod = useStore((state) => state.selectedPeriod as Period);
  const setSelectedPeriod = useStore((state) => state.setSelectedPeriod);

  const selectedInterval = useStore((state) => state.selectedInterval);
  const setSelectedInterval = useStore((state) => state.setSelectedInterval);

  const [validIntervals, setValidIntervals] = useState<Interval[]>(
    () => [...periodIntervalMap[selectedPeriod]]
  );
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
    <div className="flex flex-col space-y-4 max-w-lg ml-0">
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
  );
};

export default TimePeriodSelector;