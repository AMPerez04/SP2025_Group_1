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
    console.log("Binomial tree parameters:", binomialTree.parameters);
    console.log("Risk-neutral probability:", binomialTree.parameters.risk_neutral_probability);
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
        const levelCenter = innerHeight / 2;
        // Flip the sign here too
        return levelCenter - (sourceNode.position - sourceNode.level / 2) * nodeSpacing * 2;
      })
      .attr("x2", d => {
        const targetNode = findNodeSafely(d.target);
        return xScale(targetNode.level);
      })
      .attr("y2", d => {
        const targetNode = findNodeSafely(d.target);
        const levelCenter = innerHeight / 2;
        // Flip the sign
        return levelCenter - (targetNode.position - targetNode.level / 2) * nodeSpacing * 2;
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
      
        const levelCenter = innerHeight / 2;
        const sourceY = levelCenter - (sourceNode.position - sourceNode.level / 2) * nodeSpacing * 2;
        const targetY = levelCenter - (targetNode.position - targetNode.level / 2) * nodeSpacing * 2;
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
        const maxNodesAtLevel = d.level + 1;
        const levelCenter = innerHeight / 2;
        const y = levelCenter - (d.position - d.level / 2) * nodeSpacing * 2; 
        return `translate(${x}, ${y})`;
      });
    const nodeRadius = Math.max(12, Math.min(28, 80 / (levels + 2)));


    const tooltip = svg.append("g")
      .attr("class", "tooltip")
      .style("opacity", 0);

    tooltip.append("rect")
      .attr("width", 200)
      .attr("height", 120)
      .attr("fill", "white")
      .attr("stroke", "#aaa")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", 0.98);

    // Add text elements for tooltip content
    // Add node position information to tooltip
    // Add node position information to tooltip
    const tipPosition = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .attr("fill", "#000");

    const tipStock = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 40)
      .attr("font-size", "12px")
      .attr("fill", "#000");

    const tipOption = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 60)
      .attr("font-size", "12px")
      .attr("fill", "#000");

    const tipEuropean = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 80)
      .attr("font-size", "12px")
      .attr("fill", "#000");

    const tipExercise = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 100)  // Change from 80 to 100
      .attr("font-size", "12px")
      .attr("fill", "#d35400");
    // Add mouse events to nodes



    nodes
      .on("mouseover", function (event, d) {
        tooltip.style("opacity", 1);
        tipPosition.text(`Node: t=${d.level}, pos=${d.position}`);
        tipStock.text(`Stock: $${d.stock_price.toFixed(2)}`);
        tipOption.text(`Option (Am): $${d.option_price_american.toFixed(4)}`);
        tipEuropean.text(`Option (Eu): $${d.option_price_european.toFixed(4)}`);
        tipExercise.text(d.early_exercise ? "Early Exercise Optimal" : "");

        // Position tooltip near the mouse but avoid going off the right edge
        const [x, y] = d3.pointer(event, svg.node());
        const tooltipX = x + 15 > width - 200 ? x - 205 : x + 15;
        const tooltipY = y - 60 < 0 ? y + 10 : y - 60;
        tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);

        // Highlight the current node
        d3.select(this).select("circle")
          .attr("stroke-width", 3)
          .attr("stroke", "#0077cc");
      })
      .on("mouseout", function (event, d) {
        tooltip.style("opacity", 0);
        d3.select(this).select("circle")
          .attr("stroke-width", 2)
          .attr("stroke", d.early_exercise ? "#FF9800" : "#2196F3");
      });
    // Add node circles
    nodes.append("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => d.early_exercise ? "#FFC107" : "#FFFFFF")
      .attr("stroke", d => d.early_exercise ? "#FF9800" : "#2196F3")
      .attr("stroke-width", 2)
      // More pronounced opacity difference for probability visualization
      .attr("fill-opacity", d => {
        const maxPosition = d.level;
        const centralPosition = maxPosition / 2;
        const distanceFromCenter = Math.abs(d.position - centralPosition);
        const probability = 1 - (distanceFromCenter / (maxPosition + 1));
        return 0.3 + (probability * 0.7);
      });

    // // Add stock price text
    // nodes.append("text")
    //   .attr("y", -10)  // Increased separation
    //   .attr("text-anchor", "middle")
    //   .attr("font-size", "14px")  // Larger font
    //   .attr("font-weight", "bold")
    //   .attr("fill", "#000")
    //   .attr("stroke", "#fff")  // Text outline for better readability
    //   .attr("stroke-width", "0.5px")
    //   .text(d => `$${d.stock_price.toFixed(2)}`);

    // // Add option price text
    // nodes.append("text")
    //   .attr("y", 10)  // Increased separation
    //   .attr("text-anchor", "middle")
    //   .attr("font-size", "13px")  // Larger font
    //   .attr("font-weight", "medium")
    //   .attr("fill", "#2c3e50")
    //   .attr("stroke", "#fff")  // Text outline for better readability
    //   .attr("stroke-width", "0.3px")
    //   .text(d => `$${d.option_price_american.toFixed(2)}`);

    // // Add early exercise indicator with better contrast
    // nodes.filter(d => d.early_exercise)
    //   .append("text")
    //   .attr("y", 25)  // Move farther down
    //   .attr("text-anchor", "middle")
    //   .attr("font-size", "11px")  // Larger font
    //   .attr("font-weight", "bold")
    //   .attr("fill", "#d35400")
    //   .attr("stroke", "#fff")  // Text outline for better readability
    //   .attr("stroke-width", "0.3px");
    // Add x-axis (time steps)
    const xAxis = d3.axisBottom(xScale)
      .ticks(levels)
      .tickFormat((d, i) => `t=${i}`);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis);

    // Add legend

    const infoBox = svg.append("g")
      .attr("class", "info-box")
      .attr("transform", `translate(${0}, 20)`);

    // Add background rectangle
    infoBox.append("rect")
      .attr("width", 250)
      .attr("height", 160)
      .attr("fill", "white")
      .attr("stroke", "#ddd")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("opacity", 0.95);

    infoBox.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .text("Binomial Tree Parameters");

    const params = binomialTree.parameters;

    const infoContent = infoBox.append("g")
      .attr("transform", "translate(10, 30)");

    // Model parameters section
    infoContent.append("text")
      .attr("font-size", "12px")
      .attr("y", 15)
      .text(`Strike: $${params?.strike.toFixed(2)} | Spot: $${params?.initial_price.toFixed(2)}`);

    infoContent.append("text")
      .attr("font-size", "12px")
      .attr("y", 35)
      .text(`Volatility: ${(params?.volatility * 100).toFixed(1)}% | Rate: ${(params?.interest_rate * 100).toFixed(2)}%`);

    infoContent.append("text")
      .attr("font-size", "12px")
      .attr("y", 55)
      .text(`Time Step: ${(params?.time_step * 365).toFixed(0)} days`);

    // Probability legend
    infoContent.append("text")
      .attr("font-size", "12px")
      .attr("y", 80)
      .attr("font-weight", "bold")
      .text("Movement Probabilities:");

    // Up probability
    infoContent.append("line")
      .attr("x1", 0)
      .attr("y1", 95)
      .attr("x2", 20)
      .attr("y2", 95)
      .attr("stroke", "#4CAF50")
      .attr("stroke-width", 2);

    infoContent.append("text")
      .attr("x", 25)
      .attr("y", 99)
      .attr("font-size", "12px")
      .text(`Up: ${(binomialTree.parameters.risk_neutral_probability * 100).toFixed(0)}%`);

    // Down probability
    infoContent.append("line")
      .attr("x1", 120)
      .attr("y1", 95)
      .attr("x2", 140)
      .attr("y2", 95)
      .attr("stroke", "#F44336")
      .attr("stroke-width", 2);

    infoContent.append("text")
      .attr("x", 145)
      .attr("y", 99)
      .attr("font-size", "12px")
      .text(`Down: ${((1 - binomialTree.parameters.risk_neutral_probability) * 100).toFixed(0)}%`);

    // Node legend
    infoContent.append("circle")
      .attr("cx", 10)
      .attr("cy", 120)
      .attr("r", 8)
      .attr("fill", "#FFC107")
      .attr("stroke", "#FF9800")
      .attr("stroke-width", 2);

    infoContent.append("text")
      .attr("x", 25)
      .attr("y", 124)
      .attr("font-size", "12px")
      .text("Early Exercise Optimal");


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