import React from 'react';
import { DollarSign } from "lucide-react";
import { useStore } from "@/zustand/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DashboardCards: React.FC = () => {
    // Split into separate selectors to avoid object creation
    const selectedAsset = useStore(state => state.selectedAsset);
    const financialData = useStore(state => state.financialData);

    // Get the current price (last price in the financial data)
    const getCurrentPrice = () => {
        if (!selectedAsset || !financialData[selectedAsset.ticker]) {
            return '0.00';
        }
        const data = financialData[selectedAsset.ticker];
        const lastPrice = data[data.length - 1].value;
        return lastPrice.toFixed(2);
    };

    // Calculate price change percentage
    const getPriceChange = () => {
        if (!selectedAsset || !financialData[selectedAsset.ticker]) {
            return '0.00';
        }
        const data = financialData[selectedAsset.ticker];
        const currentPrice = data[data.length - 1].value;
        const previousPrice = data[data.length - 2]?.value ?? currentPrice;
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        return changePercent.toFixed(2);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Current Price
                    </CardTitle>
                    <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${getCurrentPrice()}</div>
                    <p className="text-xs text-muted-foreground">
                        {getPriceChange()}% from previous
                    </p>
                </CardContent>
            </Card>
            {/* Add other tiles here */}
        </div>
    );
};

export default DashboardCards;
