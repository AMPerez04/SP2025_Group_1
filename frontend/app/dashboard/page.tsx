"use client";

import React, {useEffect} from "react";
import { ResponsiveContainer } from "recharts";
import AreaChart from "@/app/dashboard/components/visualizations/areachart";
import TimePeriodSelector from "@/app/dashboard/components/visualizations/timeperiodselector";
import ForecastChart from "@/app/dashboard/components/visualizations/forecastchart";
import DashboardCards from "@/app/dashboard/components/visualizations/dashboardCards";
import AssetInfo from "./components/asset-info/asset-info";
import TechnicalIndicators from "./components/visualizations/technicalIndicators";
import OptionsChain from "./components/visualizations/optionschain";
import Market from "./components/market-page/market";
import NewsSentiment from "./components/visualizations/newssentiment";
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetHeader from "./components/asset-header";
import CandleChart from "./components/visualizations/candlechart";
import { useStore } from "@/zustand/store";
import { toast } from "sonner";

export default function Page() {
  const { chartType, selectedMarket } = useStore((state) => state);
  const setUser = useStore((state) => state.setUser);
  const currentUser = useStore((state) => state.user);

  useEffect(() => {
    if (!currentUser?.ID) {
        toast.error("User ID missing. Please refresh or log in again.");
        return;
    }
    // Only update if not already linked
    if (!currentUser.snaptradeLinked) {
        toast.success("Your investment account was linked successfully!");
        setUser({
            ...currentUser,
            snaptradeLinked: true,
        });
    }

}, [currentUser, setUser]); 

  if (selectedMarket) {
    return <Market />;
  } else {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4">
          <AssetHeader />
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Insights</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <DashboardCards />
              <Card>
                <CardHeader>
                  <CardTitle>Technical Indicators</CardTitle>
                </CardHeader>
                <CardContent className="pl-6">
                  <TechnicalIndicators />
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Card className="col-span-2 lg:col-span-4 w-full">
                  <CardHeader>
                    <CardTitle>Price</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <TimePeriodSelector hasCandleOption={true} />
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "area" ? <AreaChart /> : <CandleChart />}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <AssetInfo />
            </TabsContent>
            <TabsContent value="analytics" className="space-y-4">
              <DashboardCards />
              <div className="flex justify-center">
                <Card className="col-span-2 lg:col-span-4 w-full">
                  <CardHeader>
                    <CardTitle>Price Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <TimePeriodSelector hasCandleOption={false} />
                    <ResponsiveContainer width="100%" height="100%">
                      <ForecastChart />
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="options" className="space-y-4">
              <Card className="col-span-2 lg:col-span-4 w-full">
                <CardContent className="p-6">
                  <OptionsChain />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="news" className="space-y-4">
              <Card className="col-span-2 lg:col-span-4 w-full">
                <CardContent className="p-6">
                  <NewsSentiment />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
}
