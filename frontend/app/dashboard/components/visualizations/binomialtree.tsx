import React, { useEffect, useRef } from 'react';
import { useStore } from '@/zustand/store';
import * as d3 from 'd3';

interface BinomialTreeProps {
  preselectedStrike?: number;
  preselectedOptionType?: 'call' | 'put';
}

const BinomialTree: React.FC<BinomialTreeProps> = ({ 
  preselectedStrike, 
  preselectedOptionType = 'call'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { binomialTree, fetchBinomialTree, selectedAsset, optionsData } = useStore();
  
  useEffect(() => {
    if (!selectedAsset?.ticker || !optionsData) return;
    
    const strike = preselectedStrike || optionsData.calls[0]?.strike || 100;
    const expirationDate = optionsData.selectedDate;
    
    fetchBinomialTree(
      selectedAsset.ticker,
      strike,
      expirationDate,
      preselectedOptionType,
      Math.min(14, Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    );
  }, [selectedAsset, optionsData, preselectedStrike, preselectedOptionType, fetchBinomialTree]);
  
  useEffect(() => {
    if (!binomialTree || !containerRef.current) return;
    
    // Clear previous tree
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Set dimensions
    const width = containerRef.current.clientWidth;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Add title and description
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-lg font-medium')
      .text(`Binomial Tree for ${preselectedOptionType?.toUpperCase()} Option at $${preselectedStrike?.toFixed(2)}`);
    
    // Container for tree
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Calculate layout
    const levels = binomialTree.parameters.steps + 1;
    
    // Scales for x and y axes
    const xScale = d3.scaleLinear()
      .domain([0, levels - 1])
      .range([0, innerWidth]);
    
    const nodeSpacing = innerHeight / (levels * 2);

    // Helper function to safely find nodes
    const findNodeSafely = (id: string) => {
      const node = binomialTree.nodes.find(n => n.id === id);
      return node || { level: 0, position: 0, stock_price: 0, option_price_american: 0, early_exercise: false };
    };
    
    // Create links first (so they're behind nodes)
    g.selectAll(".tree-link")
      .data(binomialTree.links)
      .enter()
      .append("line")
      .attr("class", "tree-link")
      .attr("x1", d => {
        const sourceNode = findNodeSafely(d.source);
        return xScale(sourceNode.level);
      })
      .attr("y1", d => {
        const sourceNode = findNodeSafely(d.source);
        const nodePos = sourceNode.position;
        // Center the node at its logical position
        return nodePos * nodeSpacing * 2 + (levels - sourceNode.level - 1) * nodeSpacing;
      })
      .attr("x2", d => {
        const targetNode = findNodeSafely(d.target);
        return xScale(targetNode.level);
      })
      .attr("y2", d => {
        const targetNode = findNodeSafely(d.target);
        const nodePos = targetNode.position;
        // Center the node at its logical position
        return nodePos * nodeSpacing * 2 + (levels - targetNode.level - 1) * nodeSpacing;
      })
      .attr("stroke", d => d.direction === "up" ? "#4CAF50" : "#F44336")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);
    
    // Add probability labels to links
    g.selectAll(".link-label")
      .data(binomialTree.links)
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("x", d => {
        const sourceNode = findNodeSafely(d.source);
        const targetNode = findNodeSafely(d.target);
        return (xScale(sourceNode.level) + xScale(targetNode.level)) / 2;
      })
      .attr("y", d => {
        const sourceNode = findNodeSafely(d.source);
        const targetNode = findNodeSafely(d.target);
        const sourceY = sourceNode.position * nodeSpacing * 2 + (levels - sourceNode.level - 1) * nodeSpacing;
        const targetY = targetNode.position * nodeSpacing * 2 + (levels - targetNode.level - 1) * nodeSpacing;
        return (sourceY + targetY) / 2 - 5;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", d => d.direction === "up" ? "#4CAF50" : "#F44336")
      .text(d => `${(d.probability * 100).toFixed(0)}%`);
    
    // Now create nodes
    const nodes = g.selectAll(".tree-node")
      .data(binomialTree.nodes)
      .enter()
      .append("g")
      .attr("class", "tree-node")
      .attr("transform", d => {
        const x = xScale(d.level);
        const y = d.position * nodeSpacing * 2 + (levels - d.level - 1) * nodeSpacing;
        return `translate(${x}, ${y})`;
      });
    
    // Add node circles
    nodes.append("circle")
      .attr("r", 28)
      .attr("fill", d => d.early_exercise ? "#FFC107" : "#FFFFFF")
      .attr("stroke", d => d.early_exercise ? "#FF9800" : "#2196F3")
      .attr("stroke-width", 2);
    
    // Add stock price text
    nodes.append("text")
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(d => `$${d.stock_price.toFixed(2)}`);
    
    // Add option price text
    nodes.append("text")
      .attr("y", 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .text(d => `$${d.option_price_american.toFixed(2)}`);
    
    // Add early exercise indicator
    nodes.filter(d => d.early_exercise)
      .append("text")
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#FF5722")
      .text("EXERCISE");
    
    // Add x-axis (time steps)
    const xAxis = d3.axisBottom(xScale)
      .ticks(levels)
      .tickFormat((d, i) => `t=${i}`);
    
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis);
    
    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 150}, ${height - 70})`);
    
    // Up probability
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", "#4CAF50")
      .attr("stroke-width", 2);
    
    legend.append("text")
      .attr("x", 25)
      .attr("y", 4)
      .attr("font-size", "10px")
      .text(`Up (${(binomialTree.parameters.risk_neutral_probability * 100).toFixed(0)}%)`);
    
    // Down probability
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 20)
      .attr("x2", 20)
      .attr("y2", 20)
      .attr("stroke", "#F44336")
      .attr("stroke-width", 2);
    
    legend.append("text")
      .attr("x", 25)
      .attr("y", 24)
      .attr("font-size", "10px")
      .text(`Down (${((1 - binomialTree.parameters.risk_neutral_probability) * 100).toFixed(0)}%)`);
    
    // Early exercise node
    legend.append("circle")
      .attr("cx", 10)
      .attr("cy", 40)
      .attr("r", 10)
      .attr("fill", "#FFC107")
      .attr("stroke", "#FF9800")
      .attr("stroke-width", 2);
    
    legend.append("text")
      .attr("x", 25)
      .attr("y", 44)
      .attr("font-size", "10px")
      .text("Early Exercise");
    
    // Add model parameters
    const params = binomialTree.parameters;
    const paramText = svg.append("g")
      .attr("transform", `translate(10, ${height - 70})`);
    
    paramText.append("text")
      .attr("font-size", "10px")
      .attr("y", 0)
      .text(`Strike: $${params?.strike.toFixed(2)} | Spot: $${params?.initial_price.toFixed(2)}`);
    
    paramText.append("text")
      .attr("font-size", "10px")
      .attr("y", 15)
      .text(`Volatility: ${(params?.volatility * 100).toFixed(1)}% | Rate: ${(params?.interest_rate * 100).toFixed(2)}%`);
    
    paramText.append("text")
      .attr("font-size", "10px")
      .attr("y", 30)
      .text(`Up Factor: ${params?.up_factor.toFixed(3)} | Time Step: ${(params?.time_step * 365).toFixed(0)} days`);
    
  }, [binomialTree, preselectedOptionType, preselectedStrike]);
  
  if (!binomialTree) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium">Binomial Tree Model</h3>
        <p className="text-sm text-muted-foreground">
          Cox-Ross-Rubinstein model with {binomialTree.parameters.steps} time steps
        </p>
      </div>
      <div 
        ref={containerRef}
        className="w-full border border-border rounded-lg overflow-hidden p-4"
      ></div>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Stock prices shown at top, option prices below. Yellow nodes indicate optimal early exercise.</p>
      </div>
    </div>
  );
};

export default BinomialTree;