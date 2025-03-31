import React, { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickData,
  CandlestickSeries,
  UTCTimestamp,
  IChartApi
} from 'lightweight-charts';
import { useStore } from '../../../../zustand/store';

const CandleChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const financialData = useStore((state) => state.financialData);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const fetchFinancialData = useStore((state) => state.fetchFinancialData);
  const selectedPeriod = useStore((state) => state.selectedPeriod);
  const selectedInterval = useStore((state) => state.selectedInterval);

  // Fetch financial data when selected asset, period, or interval changes
  useEffect(() => {
    if (selectedAsset) {
      fetchFinancialData(selectedAsset.ticker, selectedPeriod, selectedInterval);
    }
  }, [selectedAsset, fetchFinancialData, selectedPeriod, selectedInterval]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart using IChartApi
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
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    // Create a candlestick series with custom options:
    // "downColor" sets the color for bearish candles (when price drops)
    const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#2d9c41',
        downColor: '#e22e29',
        borderVisible: false,
        wickUpColor: '#2d9c41',
        wickDownColor: '#e22e29',
      });
      

    // Map the financial data into the expected format for candlesticks
    if (selectedAsset && financialData[selectedAsset.ticker]) {
      const data: CandlestickData[] = financialData[selectedAsset.ticker].map((point: any) => ({
        time: point.time as UTCTimestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.value,
      }));
      candleSeries.setData(data);
      chart.timeScale().fitContent();
    }

    // Example: Handling chart resizing using the IChartApi.resize() method
    const handleResize = () => {
      chart.resize(chartContainerRef.current!.clientWidth, 400, false);
    };
    window.addEventListener('resize', handleResize);

    // Example: Subscribing to chart click events using IChartApi.subscribeClick()
    const handleChartClick = (param: any) => {
      if (!param.point) return;
      console.log(`Chart clicked at (${param.point.x}, ${param.point.y}) at time: ${param.time}`);
    };
    chart.subscribeClick(handleChartClick);

    // Cleanup on unmount: remove event listeners and dispose of the chart
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeClick(handleChartClick);
      chart.remove();
    };
  }, [financialData, selectedAsset, selectedInterval]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;
};

export default CandleChart;
