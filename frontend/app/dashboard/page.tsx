"use client";

import React from "react";
import { ResponsiveContainer } from "recharts";
import AreaChart from "@/app/dashboard/components/visualizations/areachart";

import TimePeriodSelector from "@/app/dashboard/components/visualizations/timeperiodselector";
import ForecastChart from "@/app/dashboard/components/visualizations/forecastchart";
import DashboardCards from "@/app/dashboard/components/visualizations/dashboardCards";

import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetHeader from "./components/asset-header";

export default function Page() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4">
        <div className="flex-col items-center justify-between space-y-2 md:flex md:flex-row">
          {/* <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2> */}
        </div>
        <AssetHeader />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Insights</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <DashboardCards />
            <div className="flex justify-center">
              <Card className="col-span-2 lg:col-span-4 w-full">
                <CardHeader>
                  <CardTitle>Price</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <TimePeriodSelector />
                  <ResponsiveContainer width="100%" height="100%">
                    {/* <p className="text-center italic w-[600px]">
                      Insert visualization here
                    </p> */}
                    <AreaChart />
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <DashboardCards />
            <div className="flex justify-center">
              <Card className="col-span-2 lg:col-span-4 w-full">
                <CardHeader>
                  <CardTitle>Price Prediction</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <TimePeriodSelector />
                  <ResponsiveContainer width="100%" height="100%">
                    <ForecastChart />
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
