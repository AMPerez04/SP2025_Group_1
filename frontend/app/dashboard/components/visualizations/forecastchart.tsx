import React, { useEffect, useRef } from 'react';
import { createChart, ISeriesApi, LineData, UTCTimestamp, AreaSeriesPartialOptions, AreaSeries } from 'lightweight-charts';
import { useStore } from '../../../../zustand/store';
import { Interval } from '../../../../lib/utils';
const intradayIntervals: Interval[] = ["1m", "5m", "15m", "30m", "1h"] as const;
// Add interface for financial data item
interface FinancialDataItem {
    time: number;
    value: number;
}
const ForecastChart: React.FC = () => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const forecast = useStore((state) => state.forecast);
    const fetchFinancialData = useStore((state) => state.fetchFinancialData);
    const financialData = useStore((state) => state.financialData);
    const selectedAsset = useStore((state) => state.selectedAsset);
    const fetchForecast = useStore((state) => state.fetchForecast);
    const selectedPeriod = useStore((state) => state.selectedPeriod);
    const selectedInterval = useStore((state) => state.selectedInterval);
    const error = useStore((state) => state.error);

    useEffect(() => {
        if (selectedAsset) {
            fetchFinancialData(selectedAsset, selectedPeriod, selectedInterval);
            fetchForecast(selectedAsset, selectedPeriod, selectedInterval);
        }
    }, [fetchFinancialData, fetchForecast, selectedAsset, selectedPeriod, selectedInterval]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

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
            },
        });


        if (selectedAsset && financialData[selectedAsset]) {
            const data: LineData[] = financialData[selectedAsset].map((item: FinancialDataItem) => ({
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
            if (forecast && !error) {
                const lastDate = financialData[selectedAsset][financialData[selectedAsset].length - 1].time;
                const lastDateObj = new Date(lastDate * 1000); // Convert UNIX timestamp to Date object

                const forecastData: LineData[] = Object.keys(forecast).map((key, index) => {
                    const forecastDate = new Date(lastDateObj);
                    forecastDate.setDate(forecastDate.getDate() + (index + 1)); // Increment by one day
                    return {
                        time: Math.floor(forecastDate.getTime() / 1000) as UTCTimestamp, // Convert back to UNIX timestamp
                        value: forecast[key],
                    };
                });
                const forecastColor = forecastData.length > 0 && forecastData[forecastData.length - 1].value < data[data.length - 1].value ? '#e22e29' : '#2d9c41';
                const forecastAreaSeries: ISeriesApi<'Area'> = chart.addSeries(AreaSeries, {
                    topColor: forecastColor,
                    bottomColor: '#ffffff',
                    lineColor: forecastColor,
                    lineWidth: 2,
                    lineStyle: 1, // 0: solid, 1: dotted, 2: dashed
                });

                forecastAreaSeries.setData(forecastData);
                chart.timeScale().fitContent();

                
            }
        }
        return () => {
            chart.remove();
        };
    }, [financialData, forecast, selectedAsset, error, selectedInterval]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px', margin: '0 auto' }} />;
};

export default ForecastChart;