// CandleChart.tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickData,
  CandlestickSeries,
  UTCTimestamp,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';
import { useStore } from '@/zustand/store';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  FinancialPoint,
} from '../../../utils/indicators';

const CandleChart: React.FC = () => {
  // Refs for chart containers
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartContainerRef = useRef<HTMLDivElement>(null);

  const financialData = useStore((state) => state.financialData);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const fetchFinancialData = useStore((state) => state.fetchFinancialData);
  const selectedPeriod = useStore((state) => state.selectedPeriod);
  const selectedInterval = useStore((state) => state.selectedInterval);
  const technicalIndicators = useStore((state) => state.technicalIndicators);

  // Fetch financial data when selected asset, period, or interval changes
  useEffect(() => {
    if (selectedAsset) {
      fetchFinancialData(selectedAsset.ticker, selectedPeriod, selectedInterval);
    }
  }, [selectedAsset, fetchFinancialData, selectedPeriod, selectedInterval]);

  // Main effect for rendering charts
  useEffect(() => {
    if (!mainChartContainerRef.current) return;

    // ---------------------------
    // 1. CREATE MAIN PRICE CHART
    // ---------------------------
    const mainChart = createChart(mainChartContainerRef.current, {
      width: mainChartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1', visible: false },
        horzLines: { color: '#e1e1e1', visible: false },
      },
      handleScroll: true,
      handleScale: true,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 6,
      },
    });

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#2d9c41',
      downColor: '#e22e29',
      borderVisible: false,
      wickUpColor: '#2d9c41',
      wickDownColor: '#e22e29',
    });

    if (selectedAsset && financialData[selectedAsset.ticker]) {
      const dataPoints = financialData[selectedAsset.ticker] as FinancialPoint[];
      const candlestickData: CandlestickData[] = dataPoints.map((point) => ({
        time: point.time as UTCTimestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.value,
      }));
      candleSeries.setData(candlestickData);
      mainChart.timeScale().fitContent();

      // ---------------------------
      // OVERLAY ANY PRICE INDICATORS
      // ---------------------------
      if (technicalIndicators.sma && dataPoints.length >= 20) {
        const smaData = calculateSMA(dataPoints, 20);
        const smaSeries = mainChart.addSeries(LineSeries, {
          color: '#FF0000',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
        });
        smaSeries.setData(
          smaData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
        );
      }

      if (technicalIndicators.ema && dataPoints.length >= 20) {
        const emaData = calculateEMA(dataPoints, 20);
        const emaSeries = mainChart.addSeries(LineSeries, {
          color: '#0000FF',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
        });
        emaSeries.setData(
          emaData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
        );
      }

      if (technicalIndicators.bb && dataPoints.length >= 20) {
        const bbData = calculateBollingerBands(dataPoints, 20, 2);
        // Upper Band
        const bbUpperSeries = mainChart.addSeries(LineSeries, {
          color: '#FFA500',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbUpperSeries.setData(
          bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.upper }))
        );
        // Middle Band
        const bbMiddleSeries = mainChart.addSeries(LineSeries, {
          color: '#808080',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbMiddleSeries.setData(
          bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.middle }))
        );
        // Lower Band
        const bbLowerSeries = mainChart.addSeries(LineSeries, {
          color: '#FFA500',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbLowerSeries.setData(
          bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.lower }))
        );
      }
    }

    // ---------------------------
    // 2. CREATE RSI CHART (ONLY IF ENABLED)
    // ---------------------------
    let rsiChart: ReturnType<typeof createChart> | undefined;
    if (
      technicalIndicators.rsi &&
      rsiChartContainerRef.current &&
      selectedAsset &&
      financialData[selectedAsset.ticker]
    ) {
      const dataPoints = financialData[selectedAsset.ticker] as FinancialPoint[];
      if (dataPoints.length >= 15) {
        rsiChart = createChart(rsiChartContainerRef.current, {
          width: rsiChartContainerRef.current.clientWidth,
          height: 200,
          layout: {
            background: { color: '#ffffff' },
            textColor: '#333',
          },
          grid: {
            vertLines: { color: '#e1e1e1', visible: false },
            horzLines: { color: '#e1e1e1', visible: false },
          },
          handleScroll: true,
          handleScale: true,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 6,
          },
        });

        const rsiData = calculateRSI(dataPoints, 14);
        const rsiSeries = rsiChart.addSeries(LineSeries, {
          color: '#00FF00',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
        });
        rsiSeries.setData(
          rsiData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.value,
          }))
        );

        // Add horizontal lines at 30 and 70
        rsiSeries.createPriceLine({
          price: 30,
          color: '#999',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: true,
          title: '30',
        });

        rsiSeries.createPriceLine({
          price: 70,
          color: '#999',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: true,
          title: '70',
        });
      }
    }

    // ---------------------------
    // CLEANUP
    // ---------------------------
    const handleResize = () => {
      mainChart.resize(mainChartContainerRef.current!.clientWidth, 300);
      if (rsiChart && rsiChartContainerRef.current) {
        rsiChart.resize(rsiChartContainerRef.current.clientWidth, 200);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mainChart.remove();
      if (rsiChart) {
        rsiChart.remove();
      }
    };
  }, [financialData, selectedAsset, selectedInterval, technicalIndicators]);

  return (
    <div style={{ width: '100%' }}>
      <div ref={mainChartContainerRef} style={{ width: '100%', height: '300px' }} />
      {technicalIndicators.rsi && (
        <div
          ref={rsiChartContainerRef}
          style={{ width: '100%', height: '200px', marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default CandleChart;
