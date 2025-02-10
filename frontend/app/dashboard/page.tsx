"use client";

import React from "react";

import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import { ResponsiveContainer } from "recharts";

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
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <AssetHeader />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Price
                  </CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$236.22</div>
                  <p className="text-xs text-muted-foreground">
                    -5.76% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Market Cap
                  </CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.55T</div>
                  <p className="text-xs text-muted-foreground">
                    -0.67% from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Volume</CardTitle>
                  <CreditCard className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+93,080,144</div>
                  <p className="text-xs text-muted-foreground">
                    +2.4% from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Title</CardTitle>
                  <Activity className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Description</div>
                  <p className="text-xs text-muted-foreground">Line</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-center">
              <Card className="col-span-2 lg:col-span-4">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <p className="text-center italic w-[600px]">
                      Insert visualization here
                    </p>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-center items-center h-[300px]">
              <h1 className="text-center">insights here</h1>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
