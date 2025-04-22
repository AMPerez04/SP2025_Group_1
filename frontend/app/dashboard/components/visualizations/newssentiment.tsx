"use client";

import React, { useEffect } from 'react';
import { useStore } from '@/zustand/store';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Newspaper, Clock, User } from 'lucide-react';
import Image from 'next/image';
import NewsSummaryCard from "./newssummary"

// Helper function to get sentiment class based on score
const getSentimentClass = (sentiment: number) => {
  // Strong negative: deep red
  if (sentiment < -0.6) return "bg-red-700 text-white";
  // Moderate negative: medium red
  if (sentiment < -0.3) return "bg-red-500 text-white";
  // Mild negative: light red
  if (sentiment < -0.05) return "bg-red-300 text-black";
  // Neutral: gray
  if (sentiment < 0.05) return "bg-gray-300 text-black";
  // Mild positive: light green
  if (sentiment < 0.3) return "bg-green-300 text-black";
  // Moderate positive: medium green
  if (sentiment < 0.6) return "bg-green-500 text-white";
  // Strong positive: deep green
  return "bg-green-700 text-white";
};

// Helper function to get sentiment label
const getSentimentLabel = (sentiment: number) => {
  if (sentiment < -0.6) return "Very Negative";
  if (sentiment < -0.3) return "Negative";
  if (sentiment < -0.05) return "Slightly Negative";
  if (sentiment < 0.05) return "Neutral";
  if (sentiment < 0.3) return "Slightly Positive";
  if (sentiment < 0.6) return "Positive";
  return "Very Positive";
};

// Default placeholder image
const DEFAULT_IMAGE = "/assets/news-placeholder.jpg";

const NewsSentiment: React.FC = () => {
  const { selectedAsset, newsArticles, newsLoading, fetchNewsArticles } = useStore();
  
  useEffect(() => {
    if (selectedAsset?.ticker) {
      fetchNewsArticles(selectedAsset.ticker);
    }
  }, [selectedAsset?.ticker, fetchNewsArticles]);
  
  if (newsLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!selectedAsset || newsArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Newspaper className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No News Found</h3>
        <p className="text-muted-foreground text-center">
          No recent news articles are available for {selectedAsset?.ticker || "this asset"}.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <NewsSummaryCard />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Latest News for {selectedAsset.ticker}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {newsArticles.map((article, index) => {
          const thumbnailUrl = article.imageUrl || DEFAULT_IMAGE;
          
          return (
            <Card key={index} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
              <a 
                href={article.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block relative aspect-video overflow-hidden"
              >
                <Image 
                  src={thumbnailUrl}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  unoptimized
                />
              </a>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline flex items-start gap-1 group"
                  >
                    {article.title}
                    <ExternalLink className="h-3.5 w-3.5 inline-flex opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="py-2 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {article.summary}
                </p>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-3 pt-2">
                <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <User className="h-3.5 w-3.5 mr-1" />
                    <span>{article.publisher}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>{article.published}</span>
                  </div>
                </div>
                
                <div className="flex items-center w-full">
                  <div 
                    className={`text-xs px-3 py-1 rounded-full ${getSentimentClass(article.sentiment)}`}
                  >
                    {getSentimentLabel(article.sentiment)} ({article.sentiment.toFixed(2)})
                  </div>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default NewsSentiment;