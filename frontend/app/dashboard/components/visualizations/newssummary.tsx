"use client";

import React from 'react';
import { useStore } from '@/zustand/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

const NewsSummaryCard: React.FC = () => {
  const { newsSummary } = useStore();
  
  if (!newsSummary) return null;
  
  // Get sentiment colors and icon
  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return "text-green-600";
    if (sentiment > 0.1) return "text-green-400";
    if (sentiment > -0.1) return "text-gray-500";
    if (sentiment > -0.3) return "text-red-400";
    return "text-red-600";
  };
  
  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.1) return <TrendingUp className="h-6 w-6" />;
    if (sentiment < -0.1) return <TrendingDown className="h-6 w-6" />;
    return <Minus className="h-6 w-6" />;
  };
  
  // Calculate percentages for sentiment breakdown
  const total = newsSummary.sentiment_breakdown.positive + 
                newsSummary.sentiment_breakdown.neutral + 
                newsSummary.sentiment_breakdown.negative;
                
  const positivePercent = total ? Math.round((newsSummary.sentiment_breakdown.positive / total) * 100) : 0;
  const neutralPercent = total ? Math.round((newsSummary.sentiment_breakdown.neutral / total) * 100) : 0;
  const negativePercent = total ? Math.round((newsSummary.sentiment_breakdown.negative / total) * 100) : 0;
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          News Sentiment Summary
          <span className={getSentimentColor(newsSummary.overall_sentiment)}>
            {getSentimentIcon(newsSummary.overall_sentiment)}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Summary Text */}
          <p className="text-md">{newsSummary.summary}</p>
          
          {/* Sentiment Score */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Market Sentiment:</span>
            <span className={`font-bold ${getSentimentColor(newsSummary.overall_sentiment)}`}>
              {newsSummary.sentiment_label} 
              ({newsSummary.overall_sentiment.toFixed(2)})
            </span>
          </div>
          
          {/* Sentiment Breakdown Bar */}
          <div className="pt-2">
            <p className="text-sm mb-1">News Sentiment Distribution:</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full"
                style={{ width: `${positivePercent}%` }}
                title={`Positive: ${positivePercent}%`}
              />
              <div 
                className="bg-gray-300 h-full"
                style={{ width: `${neutralPercent}%` }}
                title={`Neutral: ${neutralPercent}%`}
              />
              <div 
                className="bg-red-500 h-full"
                style={{ width: `${negativePercent}%` }}
                title={`Negative: ${negativePercent}%`}
              />
            </div>
            
            <div className="flex justify-between text-xs mt-1">
              <span>Positive: {positivePercent}%</span>
              <span>Neutral: {neutralPercent}%</span>
              <span>Negative: {negativePercent}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsSummaryCard;