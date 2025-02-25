import React, { useEffect, useRef } from 'react';
import { createChart, AreaData, AreaSeries, UTCTimestamp } from 'lightweight-charts';
import { useStore } from '../../../../zustand/store';



const AreaChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const financialData = useStore((state) => state.financialData);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const fetchFinancialData = useStore((state) => state.fetchFinancialData);
  const selectedPeriod = useStore((state) => state.selectedPeriod);
  const selectedInterval = useStore((state) => state.selectedInterval);


  useEffect(() => {
    if (selectedAsset) {
      fetchFinancialData(selectedAsset.ticker, selectedPeriod, selectedInterval);
    }
  }, [fetchFinancialData, selectedAsset, selectedPeriod, selectedInterval]);

  useEffect(() => {

    if (!chartContainerRef.current) {
      return;
    }
    const intradayIntervals = ["1m", "5m", "15m", "30m", "1h"];
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1', visible: false },
        horzLines: { color: '#e1e1e1', visible: false },
      },
      handleScroll: false,
      handleScale: false,
      timeScale: {
        timeVisible: intradayIntervals.includes(selectedInterval),
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    if (selectedAsset && financialData[selectedAsset.ticker]) {
      const data: AreaData[] = financialData[selectedAsset.ticker].map(point => ({
        time: point.time as UTCTimestamp,
        value: point.value
      }));
      const color = data.length > 0 && data[data.length - 1].value < data[0].value ? '#e22e29' : '#2d9c41';
      const areaSeries = chart.addSeries(AreaSeries, { lineWidth: 2, lineColor: color, topColor: color, bottomColor: '#ffffff', });
      areaSeries.setData(data);
      chart.timeScale().fitContent();
    }

    return () => {
      chart.remove();
    };
  }, [financialData, selectedAsset, selectedInterval]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;
};

export default AreaChart;