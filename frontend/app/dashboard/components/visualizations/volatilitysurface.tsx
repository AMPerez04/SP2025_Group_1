import React, { useEffect, useState } from 'react';
import { useStore } from '@/zustand/store';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Data, Layout, Config } from 'plotly.js';
// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface VolatilitySurfaceChartProps {
  highlightStrike?: number;
}

const VolatilitySurfaceChart: React.FC<VolatilitySurfaceChartProps> = ({ highlightStrike }) => {
  const { selectedAsset, volatilitySurface, fetchVolatilitySurface, volatilitySurfaceLoading, optionsData } = useStore();
  const [isClient, setIsClient] = useState(false);
  
  // Get the current price from options data
  const currentPrice = optionsData?.underlyingPrice || 0;
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch volatility surface data from the store
  useEffect(() => {
    if (!selectedAsset?.ticker || !isClient) return;
    const dateParam = optionsData?.selectedDate || undefined;
    fetchVolatilitySurface(selectedAsset.ticker, dateParam);
  }, [selectedAsset?.ticker, isClient, fetchVolatilitySurface, optionsData]);
  
  if (!isClient || volatilitySurfaceLoading || !volatilitySurface) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Implied Volatility Surface</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }
  
  // Simple direct approach - just use what comes from the backend
  const surfaceData = volatilitySurface ? {
    ...volatilitySurface,
    type: 'surface',
    z: volatilitySurface.z.map(row => row.map(value => value === null ? 0 : value)),
    hovertemplate: 
    '<b>Strike</b>: %{x:.2f}<br>' +
    '<b>Days to Expiry</b>: %{y}<br>' +
    '<b>IV</b>: %{z:.2f}%' +
    '<extra></extra>'
  } : null;
  
  // Filter to a single slice if highlighting a specific option
  const filteredData = (highlightStrike && optionsData?.selectedDate && surfaceData) 
    ? {
        ...surfaceData,
      } 
    : surfaceData;
  
  // If we don't have data, return early
  if (!filteredData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Implied Volatility Surface</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No data available for volatility surface</p>
        </CardContent>
      </Card>
    );
  }
  
  // Add highlight lines
  const currentPriceLine = currentPrice ? {
    type: 'scatter3d',
    mode: 'lines',
    x: Array(filteredData.y.length).fill(currentPrice),
    y: filteredData.y,
    z: filteredData.z.map(row => {
      const closestIndex = filteredData.x.reduce((closest, value, index) => 
        Math.abs(value - currentPrice) < Math.abs(filteredData.x[closest] - currentPrice) ? index : closest, 0);
      return row[closestIndex] || 0;
    }),
    line: { color: 'green', width: 6 },
    name: `Current: $${currentPrice.toFixed(2)}`,
    hovertemplate: 
    '<b>Current Price</b>: %{x:.2f}<br>' +
    '<b>Days to Expiry</b>: %{y}<br>' +
    '<b>IV</b>: %{z:.2f}%' +
    '<extra></extra>',
  } : null;
  
  const highlightStrikeLine = highlightStrike ? {
    type: 'scatter3d',
    mode: 'lines',
    x: Array(filteredData.y.length).fill(highlightStrike),
    y: filteredData.y,
    z: filteredData.z.map(row => {
      const closestIndex = filteredData.x.reduce((closest, value, index) => 
        Math.abs(value - highlightStrike) < Math.abs(filteredData.x[closest] - highlightStrike) ? index : closest, 0);
      return row[closestIndex] || 0;
    }),
    line: { color: 'red', width: 6 },
    name: `Strike: $${highlightStrike.toFixed(2)}`,
    hovertemplate: 
    '<b>Selected Strike</b>: %{x:.2f}<br>' +
    '<b>Days to Expiry</b>: %{y}<br>' +
    '<b>IV</b>: %{z:.2f}%' +
    '<extra></extra>',
  } : null;
  
  // Filter out null values for the plot data
  const plotData = [
    filteredData,
    ...(currentPriceLine ? [currentPriceLine] : []),
    ...(highlightStrikeLine ? [highlightStrikeLine] : [])
  ].filter(Boolean);
  
  const maxY = Math.max(...filteredData.y);
  const maxZ = Math.max(...filteredData.z.flat().filter(v => typeof v === 'number' && !isNaN(v)));
  
  const layout = {
    autosize: true,
    height: 600,
    scene: {
      aspectratio: { x: 1.5, y: 1.5, z: 1 },
      xaxis: { 
        title: {text:'Strike Price'},
        tickprefix: '$',  // Add dollar sign to each tick
        tickformat: '.2f',  // Format to 2 decimal places
        tickmode: 'auto',
        nticks: 10  // Control number of ticks shown
      },
      yaxis: { 
        title: {text:'Expiry Date'},
        tickmode: 'array',
        tickvals: filteredData.y,  // Use the actual day values
        ticktext: filteredData.y.map(day => `${day}`) // Format days
      },
      zaxis: { 
        title: {text:'Implied Volatility'},
        ticksuffix: '%',  // Add percent sign to each tick
        tickformat: '.1f'  // Format to 1 decimal place
      },
      camera: { eye: { x: 1.8, y: 1.8, z: 1.2 } }
    },
    margin: { l: 0, r: 0, b: 0, t: 0, pad: 0 },
    showlegend: true,
    legend: {
      x: 0.8,
      y: 0.9,
      bgcolor: 'rgba(255, 255, 255, 0.5)',
      bordercolor: 'rgba(0, 0, 0, 0.2)',
      borderwidth: 1,
    },
    annotations: [
      {
        showarrow: false,
        x: currentPrice,
        y: maxY,
        z: maxZ,
        text: 'Current Price',
        font: { color: 'green', size: 12 },
        xanchor: 'left' as const,
        yanchor: 'bottom' as const,
        zanchor: 'top' as const,
      },
      ...(highlightStrike ? [{
        showarrow: false,
        x: highlightStrike,
        y: maxY,
        z: maxZ,
        text: 'Selected Strike',
        font: { color: 'red', size: 12 },
        xanchor: 'left' as const,
        yanchor: 'bottom' as const,
        zanchor: 'top' as const,
      }] : [])
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implied Volatility Surface</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={plotData as Data[]}
          layout={layout as Partial<Layout>}
          config={{ responsive: true, displayModeBar: true } as Config}
          style={{ width: '100%', height: '600px' }}
        />
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Drag to rotate. Scroll to zoom. Hover for details.</p>
          <p className="mt-1">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span> Current Price
            {highlightStrike && (
              <><span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1 ml-3"></span> Selected Strike</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VolatilitySurfaceChart;