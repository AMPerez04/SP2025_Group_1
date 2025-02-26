import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineData, UTCTimestamp, AreaSeries } from 'lightweight-charts';
import { useStore } from '../../../../zustand/store';
import { Interval, formatChartTime } from '../../../../lib/utils';
import ProgressBar from '@/components/ui/progressbar.tsx';
const intradayIntervals: Interval[] = ["1m", "5m", "15m", "30m", "1h"] as const;

const ForecastChart: React.FC = () => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const forecastData = useStore((state) => state.forecastData);
    const fetchFinancialData = useStore((state) => state.fetchFinancialData);
    const financialData = useStore((state) => state.financialData);
    const selectedAsset = useStore((state) => state.selectedAsset);
    const fetchForecast = useStore((state) => state.fetchForecast);
    const selectedPeriod = useStore((state) => state.selectedPeriod);
    const selectedInterval = useStore((state) => state.selectedInterval);
    const [isChartReady, setIsChartReady] = useState(false);
    const [progress, setProgress] = useState(0);




    useEffect(() => {
        const fetchData = async () => {
        if (selectedAsset) {
            setIsChartReady(false);
            setProgress(0);
            const interval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 0.1, 90));
            }, 1);
            await fetchFinancialData(selectedAsset.ticker, selectedPeriod, selectedInterval);
            clearInterval(interval);
            setProgress(50);
            await fetchForecast(selectedAsset.ticker, selectedPeriod, selectedInterval);
            setIsChartReady(true);
            setProgress(100);
        }
        };
        fetchData();
    }, [fetchFinancialData, fetchForecast, selectedAsset, selectedPeriod, selectedInterval]);

    useEffect(() => {
        
        if (!isChartReady) {
            return;
        }

    try{
        if (!chartContainerRef.current) throw new Error("Chart container is not available.");
        if (!selectedAsset) throw new Error("No asset selected.");
        if (!financialData[selectedAsset.ticker]) throw new Error("No financial data available for the selected asset.");

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
            // Disable all user interaction
            handleScroll: false,
            handleScale: false,
            timeScale: {
                timeVisible: intradayIntervals.includes(selectedInterval),
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 12,
                fixLeftEdge: true,
                fixRightEdge: true,
                minBarSpacing: 10,
                uniformDistribution: true,
                tickMarkFormatter: (time: number) => formatChartTime(time, selectedInterval)
            },
        });

        const data: LineData[] = financialData[selectedAsset.ticker]
            .map((item) => ({
                time: item.time as UTCTimestamp,
                value: item.value,
            }))
            .sort((a, b) => (a.time) - (b.time));
        if (data.length === 0) throw new Error("No historical data available.");

        // Set up historical data series
        const color = data.length > 0 && data[data.length - 1].value < data[0].value ? '#e22e29' : '#2d9c41';
        const areaSeries = chart.addSeries(AreaSeries, {
            topColor: color,
            bottomColor: '#ffffff',
            lineColor: color,
            lineWidth: 2,
        });
        areaSeries.setData(data);

        if (forecastData && forecastData[selectedAsset.ticker]) {
            // Convert and deduplicate forecast data timestamps
            const uniqueForecast = Array.from(new Map(
                forecastData[selectedAsset.ticker]
                    .filter((item) => item.value !== null && !isNaN(item.value))
                    .map((item) => ({
                        time: item.time as UTCTimestamp,
                        value: item.value,
                    }))
                    .map(item => [item.time, item])
            ).values()).sort((a, b) => (a.time) - (b.time));

            const lastHistoricalPoint = data[data.length - 1];
            // Create connected forecast ensuring unique timestamps
            const futureForecast = uniqueForecast.filter(point =>
                (point.time) > (lastHistoricalPoint.time as UTCTimestamp)
            );

            if (futureForecast.length > 0) {
                const connectedForecast = [
                    lastHistoricalPoint,
                    // Only add bridge if gap is more than 5 minutes
                    ...((futureForecast[0].time as number) > ((lastHistoricalPoint.time as number) + 300) ? [{
                        time: ((lastHistoricalPoint.time as number) + 60) as UTCTimestamp,
                        value: (lastHistoricalPoint.value + futureForecast[0].value) / 2
                    }] : []),
                    ...futureForecast
                ];
                // Verify no duplicates
                const timeSet = new Set();
                const hasDuplicates = connectedForecast.some(point => {
                    if (timeSet.has(point.time)) return true;
                    timeSet.add(point.time);
                    return false;
                });
                if (hasDuplicates) throw new Error("Duplicate timestamps detected in forecast data.");

                const forecastColor = futureForecast[futureForecast.length - 1].value < lastHistoricalPoint.value
                    ? '#e22e29'
                    : '#2d9c41';

                const forecastAreaSeries = chart.addSeries(AreaSeries, {
                    topColor: forecastColor,
                    bottomColor: '#ffffff',
                    lineColor: forecastColor,
                    lineWidth: 2,
                    lineStyle: 1, // 0: solid, 1: dashed, 2: dotted
                });

                forecastAreaSeries.setData(connectedForecast);
    
            }

            chart.timeScale().applyOptions({
                barSpacing: 12,
            });
        }

        // chart.timeScale().fitContent();
        chart.timeScale().applyOptions({
            barSpacing: 12,
        });
        chart.timeScale().fitContent();
        return () => chart.remove();
    } catch (error) {
        console.error('ERROR: error creating forecast chart',error);
    }
    }, [isChartReady, financialData, forecastData, selectedAsset, selectedInterval]);
    
    if (!selectedAsset || !financialData[selectedAsset.ticker]) {
        return <ProgressBar progress={progress} />;
    }

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;

};

export default ForecastChart;