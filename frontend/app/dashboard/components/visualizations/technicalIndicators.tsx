// /dashboard/components/visualizations/TechnicalIndicators.tsx
"use client";

import React from "react";
import { useStore } from "@/zustand/store";

const TechnicalIndicators: React.FC = () => {
  const indicators = useStore((state) => state.technicalIndicators);
  const toggleIndicator = useStore((state) => state.toggleIndicator);
  const resetIndicators = useStore((state) => state.resetIndicators);

  return (
    <div >
    
      <div className="flex space-x-4">
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={indicators.sma}
            onChange={() => toggleIndicator("sma")}
          />
          <span>SMA</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={indicators.ema}
            onChange={() => toggleIndicator("ema")}
          />
          <span>EMA</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={indicators.rsi}
            onChange={() => toggleIndicator("rsi")}
          />
          <span>RSI</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={indicators.bb}
            onChange={() => toggleIndicator("bb")}
          />
          <span>Bollinger Bands</span>
        </label>
      </div>
      <button
        onClick={resetIndicators}
        className="mt-2 text-sm text-red-500 underline"
      >
        Reset Indicators
      </button>
    </div>
  );
};

export default TechnicalIndicators;
