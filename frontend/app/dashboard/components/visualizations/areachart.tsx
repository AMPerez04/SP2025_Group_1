import React, { useEffect, useRef } from 'react';
import { createChart, AreaData, AreaSeries } from 'lightweight-charts';
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
      fetchFinancialData(selectedAsset, selectedPeriod, selectedInterval);
    }
  }, [fetchFinancialData, selectedAsset, selectedPeriod, selectedInterval]);

  useEffect(() => {
    console.log('useEffect triggered');
    console.log('Selected Asset:', selectedAsset);
    console.log('Financial Data:', financialData);

    if (!chartContainerRef.current) {
      console.log('Chart container not found');
      return;
    }
    const intradayIntervals = ["1m", "5m", "15m", "30m", "1h"];
    const tickMarkFormatter = (time: number, tickMarkType: any) => {
      const date = new Date(time * 1000); // Convert UNIX timestamp to Date
      if (selectedPeriod === '1d') {
        return date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true, // Convert to 12-hour format
        });
      } else if (selectedPeriod === '5d') {
        return date.toLocaleDateString('en-US', {
          weekday: 'short', // Display short weekday name
        });
      } else if (['1mo', '3mo', '6mo', '1y', 'ytd'].includes(selectedPeriod)) {
        return date.toLocaleDateString('en-US', {
          month: 'short', // Display short month name
          day: 'numeric', // Display day of the month
        });
      } else if (['2y', '5y', '10y', 'max'].includes(selectedPeriod)) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric', // Display full year
        });
      }
      return date.toLocaleDateString('en-US');
    };
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: {
          color: '#e1e1e1',
          visible: false,
        },
        horzLines: {
          color: '#e1e1e1',
          visible: false,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
      timeScale: {
        timeVisible: intradayIntervals.includes(selectedInterval),
        secondsVisible: false, // Hide seconds
        // tickMarkFormatter,
      },
    });
    
    if (selectedAsset && financialData[selectedAsset]) {
      console.log('Data for Selected Asset:', financialData[selectedAsset]);

      const assetData = financialData[selectedAsset];

      const data: AreaData[] = financialData[selectedAsset] || [];
      console.log('Formatted Data:', data);
      const color = data.length > 0 && data[data.length - 1].value < data[0].value ? '#e22e29' : '#2d9c41';
      const areaSeries = chart.addSeries(AreaSeries, { lineWidth: 2, lineColor: color, topColor: color, bottomColor: '#ffffff', });


      areaSeries.setData(data);
      chart.timeScale().fitContent();

      // chart.timeScale().applyOptions({
      //   timeVisible: intradayIntervals.includes(selectedInterval),
      //   secondsVisible: false, // Hide seconds
      //   tickMarkFormatter,
      // });
    }

    return () => {
      chart.remove();
    };
  }, [financialData, selectedAsset]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;
};

export default AreaChart;