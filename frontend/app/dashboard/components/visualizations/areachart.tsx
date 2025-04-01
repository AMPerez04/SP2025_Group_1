// AreaChart.tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  AreaData,
  AreaSeries,
  UTCTimestamp,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';
import { useStore } from '../../../../zustand/store';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  FinancialPoint,
} from '../../../utils/indicators';

const AreaChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
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
  }, [fetchFinancialData, selectedAsset, selectedPeriod, selectedInterval]);

  // Main effect for rendering charts and overlays
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // ---------------------------
    // 1. CREATE MAIN AREA CHART
    // ---------------------------
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
        barSpacing: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    if (selectedAsset && financialData[selectedAsset.ticker]) {
      const data = financialData[selectedAsset.ticker].map((point) => ({
        time: point.time as UTCTimestamp,
        value: point.value,
      })) as AreaData[];

      // Choose a color based on price direction
      const color =
        data.length > 0 && data[data.length - 1].value < data[0].value
          ? '#e22e29'
          : '#2d9c41';

      const areaSeries = chart.addSeries(AreaSeries, {
        lineWidth: 2,
        lineColor: color,
        topColor: color,
        bottomColor: '#ffffff',
      });
      areaSeries.setData(data);
      chart.timeScale().fitContent();

      // Convert data to FinancialPoint[] for calculations
      const dataPoints = financialData[selectedAsset.ticker] as FinancialPoint[];

      // ---------------------------
      // OVERLAY TECHNICAL INDICATORS
      // ---------------------------
      if (technicalIndicators.sma && dataPoints.length >= 20) {
        const smaData = calculateSMA(dataPoints, 20);
        const smaSeries = chart.addSeries(LineSeries, {
          color: '#FF0000',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
        });
        smaSeries.setData(
          smaData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.value,
          }))
        );
      }

      if (technicalIndicators.ema && dataPoints.length >= 20) {
        const emaData = calculateEMA(dataPoints, 20);
        const emaSeries = chart.addSeries(LineSeries, {
          color: '#0000FF',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
        });
        emaSeries.setData(
          emaData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.value,
          }))
        );
      }

      if (technicalIndicators.bb && dataPoints.length >= 20) {
        const bbData = calculateBollingerBands(dataPoints, 20, 2);
        // Upper Band
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: '#FFA500',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbUpperSeries.setData(
          bbData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.upper,
          }))
        );
        // Middle Band
        const bbMiddleSeries = chart.addSeries(LineSeries, {
          color: '#808080',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbMiddleSeries.setData(
          bbData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.middle,
          }))
        );
        // Lower Band
        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: '#FFA500',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        });
        bbLowerSeries.setData(
          bbData.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.lower,
          }))
        );
      }
    }

    // ---------------------------
    // 2. CREATE RSI CHART (IF ENABLED)
    // ---------------------------
    let rsiChart: ReturnType<typeof createChart> | undefined;
    if (
      technicalIndicators.rsi &&
      selectedAsset &&
      financialData[selectedAsset.ticker] &&
      rsiChartContainerRef.current
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
    // CLEANUP & RESIZE HANDLING
    // ---------------------------
    const handleResize = () => {
      chart.resize(chartContainerRef.current!.clientWidth, 400);
      if (rsiChart && rsiChartContainerRef.current) {
        rsiChart.resize(rsiChartContainerRef.current.clientWidth, 200);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (rsiChart) {
        rsiChart.remove();
      }
    };
  }, [financialData, selectedAsset, selectedInterval, technicalIndicators]);

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '400px', margin: '0 auto' }}
      />
      {technicalIndicators.rsi && (
        <div
          ref={rsiChartContainerRef}
          style={{ width: '100%', height: '200px', marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default AreaChart;
