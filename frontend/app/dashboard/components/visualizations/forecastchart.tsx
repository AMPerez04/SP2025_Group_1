import React, { useEffect, useRef } from 'react';
import { createChart, ISeriesApi, LineData, UTCTimestamp, AreaSeriesPartialOptions, AreaSeries } from 'lightweight-charts';
import { useStore, TimeSeriesPoint } from '../../../../zustand/store';
import { Interval } from '../../../../lib/utils';
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
    const error = useStore((state) => state.error);

    useEffect(() => {
        if (selectedAsset) {
            fetchFinancialData(selectedAsset.ticker, selectedPeriod, selectedInterval);
            fetchForecast(selectedAsset.ticker, selectedPeriod, selectedInterval);
        }
    }, [fetchFinancialData, fetchForecast, selectedAsset, selectedPeriod, selectedInterval]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Make sure chart is configured to display times correctly
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
                fixLeftEdge: true,
                fixRightEdge: true,
                tickMarkFormatter: (time:number) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            },
        });


        if (selectedAsset && financialData[selectedAsset.ticker]) {
            const data: LineData[] = financialData[selectedAsset.ticker].map((item: TimeSeriesPoint) => ({
                time: item.time as UTCTimestamp, // Cast to UTCTimestamp
                value: item.value,
            }));
            const color = data.length > 0 && data[data.length - 1].value < data[0].value ? '#e22e29' : '#2d9c41';
            const areaSeriesOptions: AreaSeriesPartialOptions = {
                topColor: color,
                bottomColor: '#ffffff',
                lineColor: color,
                lineWidth: 2,
            };
            const areaSeries: ISeriesApi<'Area'> = chart.addSeries(AreaSeries, areaSeriesOptions);

            areaSeries.setData(data);
            if (forecastData && !error) {
                // const lastDate = financialData[selectedAsset.ticker][financialData[selectedAsset.ticker].length - 1].time;
                // const lastDateObj = new Date(lastDate * 1000);

                // Convert forecast to TimeSeriesPoint format
                const forecast: LineData[] = forecastData[selectedAsset.ticker]
                    .filter((item: TimeSeriesPoint) => item.value !== null && !isNaN(item.value))
                    .map((item: TimeSeriesPoint) => ({
                        time: item.time as UTCTimestamp,
                        value: item.value,
                    }));

                const forecastColor = forecast.length > 0 && forecastData[selectedAsset.ticker][forecast.length - 1].value < data[data.length - 1].value ? '#e22e29' : '#2d9c41';
                const forecastAreaSeries: ISeriesApi<'Area'> = chart.addSeries(AreaSeries, {
                    topColor: forecastColor,
                    bottomColor: '#ffffff',
                    lineColor: forecastColor,
                    lineWidth: 2,
                    lineStyle: 1, // 0: solid, 1: dotted, 2: dashed
                });

                forecastAreaSeries.setData(forecast);
                chart.timeScale().fitContent();

                // After getting forecast data, connect with historical data
                if (forecastData && selectedAsset && financialData[selectedAsset.ticker]) {
                    // Get the last point from historical data
                    const lastHistoricalPoint = financialData[selectedAsset.ticker][financialData[selectedAsset.ticker].length - 1];
                    
                    // Add this point to the beginning of the forecast data
                    const connectedForecast = [
                        {
                            time: lastHistoricalPoint.time as UTCTimestamp,
                            value: lastHistoricalPoint.value
                        },
                        ...forecast
                    ];
                    
                    forecastAreaSeries.setData(connectedForecast);
                }
            }
        }
        return () => {
            chart.remove();
        };
    }, [financialData, forecastData, selectedAsset, error, selectedInterval]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;
};

export default ForecastChart;