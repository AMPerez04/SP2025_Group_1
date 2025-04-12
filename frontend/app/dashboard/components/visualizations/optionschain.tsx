import React, { useState, useEffect } from "react";
import { useStore, OptionsChain } from "@/zustand/store";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";
import BinomialTree from "./binomialtree";
import VolatilitySurfaceChart from "./volatilitysurface";
import { cn } from "@/lib/utils";

// Utility function to format numbers with commas
const numberWithCommas = (x: number): string => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Utility function to get color for price changes
const getChangeColor = (change: number): string => {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-gray-500";
};

// Simple Error Boundary component
class ErrorBoundary extends React.Component<{
  fallback: React.ReactNode;
  children: React.ReactNode;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error in component:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
      <div
        className="bg-blue-600 h-2.5 rounded-full"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

const OptionsChainView: React.FC = () => {
  const selectedAsset = useStore((state) => state.selectedAsset);
  const optionsData = useStore((state) => state.optionsData);
  const optionsLoading = useStore((state) => state.optionsLoading);
  const fetchOptionsData = useStore((state) => state.fetchOptionsData);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionsChain | null>(
    null
  );
  const [selectedOptionType, setSelectedOptionType] = useState<
    "calls" | "puts"
  >("calls");
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calls" | "puts" | "both">("calls");

  // Fetch options data when the selected asset changes
  useEffect(() => {
    if (selectedAsset?.ticker) {
      const loadOptionsData = async () => {
        setProgress(10);
        await fetchOptionsData(selectedAsset.ticker);
        setProgress(100);

        // Reset progress after a delay
        setTimeout(() => setProgress(0), 500);
      };

      loadOptionsData();
    }
  }, [selectedAsset, fetchOptionsData]);

  // Update selectedDate when options data changes
  useEffect(() => {
    if (optionsData && optionsData.expirationDates.length > 0) {
      setSelectedDate(
        optionsData.selectedDate || optionsData.expirationDates[0]
      );
    }
  }, [optionsData]);

  // Handle expiration date change
  const handleExpirationChange = async (date: string) => {
    setSelectedDate(date);
    if (selectedAsset?.ticker) {
      setProgress(10);
      await fetchOptionsData(selectedAsset.ticker, date);
      setProgress(100);

      // Reset progress after a delay
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: OptionsChain, type: "calls" | "puts") => {
    setSelectedOption(option);
    setSelectedOptionType(type);
    setOptionDialogOpen(true);
  };

  // Render option row - for calls only and puts only views
  const renderSingleTypeOptionRow = (
    option: OptionsChain,
    type: "calls" | "puts",
    index: number
  ) => {
    const isSelected =
      selectedOption?.strike === option.strike && selectedOptionType === type;

    return (
      <TableRow
        key={`${type}-${option.strike}-${index}`}
        className={cn(
          "cursor-pointer transition-colors",
          isSelected ? "bg-muted" : "hover:bg-muted/50",
          option.inTheMoney ? "bg-blue-50" : ""
        )}
        onClick={() => handleOptionSelect(option, type)}
      >
        <TableCell
          className={cn(
            "py-3 border-l-2",
            option.inTheMoney ? "border-l-blue-600" : "border-l-transparent"
          )}
        >
          ${option.strike.toFixed(2)}
        </TableCell>
        <TableCell className="text-right py-3">
          ${option.lastPrice.toFixed(2)}
        </TableCell>
        <TableCell className="text-right py-3">
          ${option.bid.toFixed(2)}
        </TableCell>
        <TableCell className="text-right py-3">
          ${option.ask.toFixed(2)}
        </TableCell>
        <TableCell
          className={cn(
            "text-right py-3",
            getChangeColor(option.percentChange)
          )}
        >
          {option.percentChange >= 0 ? "+" : ""}
          {option.percentChange.toFixed(2)}%
        </TableCell>
        <TableCell className="text-right py-3">
          {numberWithCommas(option.volume)}
        </TableCell>
        <TableCell className="text-right py-3">
          {numberWithCommas(option.openInterest)}
        </TableCell>
        <TableCell className="text-right py-3">
          {(option.impliedVolatility * 100).toFixed(1)}%
        </TableCell>
        <TableCell className="text-right py-3">
          ${option.americanPrice.toFixed(2)}
        </TableCell>
        <TableCell className="text-right py-3">
          ${option.earlyExerciseValue.toFixed(3)}
        </TableCell>
      </TableRow>
    );
  };

  // Generate a combined map of all strikes from calls and puts
  const generateCombinedStrikesMap = () => {
    if (!optionsData) return new Map();

    const strikesMap = new Map();

    optionsData.calls.forEach((call) => {
      strikesMap.set(call.strike, { call, put: null });
    });

    optionsData.puts.forEach((put) => {
      if (strikesMap.has(put.strike)) {
        strikesMap.get(put.strike).put = put;
      } else {
        strikesMap.set(put.strike, { call: null, put });
      }
    });

    return new Map([...strikesMap.entries()].sort((a, b) => a[0] - b[0]));
  };

  // Render both calls and puts in one table with strike in the middle
  const renderCombinedOptionsTable = () => {
    const strikesMap = generateCombinedStrikesMap();

    return Array.from(strikesMap.entries()).map(
      ([strike, { call, put }], index) => {
        const callSelected =
          selectedOption?.strike === strike && selectedOptionType === "calls";
        const putSelected =
          selectedOption?.strike === strike && selectedOptionType === "puts";

        const callInTheMoney = call?.inTheMoney === true;
        const putInTheMoney = put?.inTheMoney === true;

        // Base row styling - adding hover effect to the entire row
        const rowBaseClass = cn(
          "transition-colors border-b group",
          // If either option is selected, apply selected style
          callSelected || putSelected ? "bg-muted" : "",
          // Apply hover effect to entire row based on its status
          callInTheMoney
            ? "hover:bg-blue-100/80"
            : putInTheMoney
            ? "hover:bg-blue-100/80"
            : "hover:bg-blue-100/80"
        );

        return (
          <TableRow
            key={`combined-${strike}-${index}`}
            className={rowBaseClass}
          >
            {/* CALL COLUMNS */}
            {[
              call?.lastPrice ? `$${call.lastPrice.toFixed(2)}` : "—",
              call?.bid ? `$${call.bid.toFixed(2)}` : "—",
              call?.ask ? `$${call.ask.toFixed(2)}` : "—",
              call
                ? `${
                    call.percentChange >= 0 ? "+" : ""
                  }${call.percentChange.toFixed(2)}%`
                : "—",
              call ? `${(call.impliedVolatility * 100).toFixed(1)}%` : "—",
            ].map((cellContent, cellIndex) => (
              <TableCell
                key={`call-${strike}-${cellIndex}`}
                onClick={() => call && handleOptionSelect(call, "calls")}
                className={cn(
                  "text-right py-3",
                  call ? "cursor-pointer" : "",
                  // Apply first-cell border without hover effect
                  cellIndex === 0 && callInTheMoney
                    ? "border-l-2 border-l-blue-600"
                    : "",
                  // Background color without hover
                  callInTheMoney ? "bg-blue-50" : "",
                  // Change color for percentage values
                  cellIndex === 3 && call
                    ? getChangeColor(call.percentChange)
                    : ""
                  // Remove individual cell hover effect
                  // "hover:bg-transparent"
                )}
              >
                {cellContent}
              </TableCell>
            ))}

            {/* STRIKE PRICE IN MIDDLE */}
            <TableCell className="font-medium text-center border-x py-3 bg-muted/5 hover:bg-transparent">
              ${strike.toFixed(2)}
            </TableCell>

            {/* PUT COLUMNS */}
            {[
              put ? `${(put.impliedVolatility * 100).toFixed(1)}%` : "—",
              put
                ? `${
                    put.percentChange >= 0 ? "+" : ""
                  }${put.percentChange.toFixed(2)}%`
                : "—",
              put?.ask ? `$${put.ask.toFixed(2)}` : "—",
              put?.bid ? `$${put.bid.toFixed(2)}` : "—",
              put?.lastPrice ? `$${put.lastPrice.toFixed(2)}` : "—",
            ].map((cellContent, cellIndex) => (
              <TableCell
                key={`put-${strike}-${cellIndex}`}
                onClick={() => put && handleOptionSelect(put, "puts")}
                className={cn(
                  "text-right py-3",
                  put ? "cursor-pointer" : "",
                  // Apply first-cell border without hover effect
                  cellIndex === 0 && putInTheMoney
                    ? "border-l-2 border-l-blue-600"
                    : "",
                  // Background color without hover
                  putInTheMoney ? "bg-blue-50" : "",
                  // Change color for percentage values
                  cellIndex === 1 && put
                    ? getChangeColor(put.percentChange)
                    : ""
                  // Remove individual cell hover effect
                  // "hover:bg-transparent"
                )}
              >
                {cellContent}
              </TableCell>
            ))}
          </TableRow>
        );
      }
    );
  };

  if (optionsLoading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Loading Options Data</h2>
        <ProgressBar progress={progress} />
      </div>
    );
  }

  if (!selectedAsset) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">No Asset Selected</h2>
        <p className="text-muted-foreground text-center">
          Please select a stock to view options data.
        </p>
      </div>
    );
  }

  if (
    !optionsData ||
    !optionsData.expirationDates ||
    optionsData.expirationDates.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">No Options Available</h2>
        <p className="text-muted-foreground text-center">
          No options trading is available for {selectedAsset.ticker}.
        </p>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T16:00:00-04:00");
    return date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {selectedAsset.ticker} Options Chain
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Current Price: ${optionsData.underlyingPrice.toFixed(2)}
            </span>
            <span>•</span>
            <span>Div Yield: {optionsData.dividendYield.toFixed(2)}%</span>
            <span>•</span>
            <span>
              Int Rate: {(optionsData.interestRate * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="w-[180px]">
          <Select value={selectedDate} onValueChange={handleExpirationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              {optionsData.expirationDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatDate(date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View mode selection */}
      <div className="flex space-x-2 mb-2">
        <Button
          variant={viewMode === "calls" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setViewMode("calls");
            setSelectedOptionType("calls");
            setSelectedOption(null);
          }}
          className={cn(
            "rounded-full",
            viewMode === "calls" ? "bg-gray-300 hover:bg-gray-400" : ""
          )}
        >
          Calls Only
        </Button>
        <Button
          variant={viewMode === "puts" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setViewMode("puts");
            setSelectedOptionType("puts");
            setSelectedOption(null);
          }}
          className={cn(
            "rounded-full",
            viewMode === "puts" ? "bg-gray-300 hover:bg-gray-400" : ""
          )}
        >
          Puts Only
        </Button>
        <Button
          variant={viewMode === "both" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setViewMode("both");
            setSelectedOption(null);
          }}
          className={cn(
            "rounded-full",
            viewMode === "both" ? "bg-gray-300 hover:bg-gray-400" : ""
          )}
        >
          Side by Side
        </Button>
        <div className="text-sm flex flex-wrap items-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>In-the-money</span>
          </div>
        </div>
      </div>

      {/* Options Tables */}
      {viewMode === "both" ? (
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    colSpan={5}
                    className="text-center border-b-2 border-r-0"
                  >
                    CALLS
                  </TableHead>
                  <TableHead className="text-center border-b-2 border-x-0 bg-gray-200 bg-opacity-20">
                    STRIKE
                  </TableHead>
                  <TableHead
                    colSpan={5}
                    className="text-center border-b-2 border-l-0"
                  >
                    PUTS
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  {/* Call Headers */}
                  <TableHead className="text-right font-semibold">
                    Last
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Bid
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Ask
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Change
                  </TableHead>
                  <TableHead className="text-right font-semibold">IV</TableHead>

                  {/* Strike Column */}
                  <TableHead className="text-center font-semibold border-x">
                    Strike
                  </TableHead>

                  {/* Put Headers */}
                  <TableHead className="text-right font-semibold">IV</TableHead>
                  <TableHead className="text-right font-semibold">
                    Change
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Ask
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Bid
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Last
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderCombinedOptionsTable()}</TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1">
          {/* Calls Table */}
          {viewMode === "calls" && (
            <Card>
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px] font-semibold">
                        Strike
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Last
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Bid
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Ask
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Change
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Volume
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Open Int
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        IV
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        <div className="flex items-center justify-end">
                          Model
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="ml-1 h-4 w-4 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  Theoretical option price using binomial model
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        <div className="flex items-center justify-end">
                          Ex Premium
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="ml-1 h-4 w-4 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  Early exercise premium (American - European)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optionsData.calls.map((call, idx) =>
                      renderSingleTypeOptionRow(call, "calls", idx)
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Puts Table */}
          {viewMode === "puts" && (
            <Card>
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px] font-semibold">
                        Strike
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Last
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Bid
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Ask
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Change
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Volume
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Open Int
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        IV
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        <div className="flex items-center justify-end">
                          Model
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="ml-1 h-4 w-4 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  Theoretical option price using binomial model
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        <div className="flex items-center justify-end">
                          Ex Premium
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="ml-1 h-4 w-4 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  Early exercise premium (American - European)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optionsData.puts.map((put, idx) =>
                      renderSingleTypeOptionRow(put, "puts", idx)
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Option Details Dialog */}
      {/* Option Details Dialog - Using a horizontal layout */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        {selectedOption && (
          <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] p-0 overflow-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>
                {selectedOptionType === "calls" ? "Call" : "Put"} Option Details
                - Strike ${selectedOption.strike.toFixed(2)}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col md:flex-row h-full">
              {/* Option Info Sidebar */}
              <div className="w-full md:w-72 p-6 border-r bg-muted/5">
                {/* Option Badge */}
                <div
                  className={cn(
                    "px-3 py-1.5 rounded-md text-white mb-4 inline-block bg-blue-600"
                  )}
                >
                  {selectedOptionType === "calls"
                    ? "Call Option"
                    : "Put Option"}
                </div>

                {/* Key Information */}
                <div className="space-y-4">
                  {/* Strike Price */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Strike Price
                    </h3>
                    <p className="text-2xl font-mono font-semibold">
                      ${selectedOption.strike.toFixed(2)}
                    </p>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Expiration Date
                    </h3>
                    <p className="font-medium">{formatDate(selectedDate)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.ceil(
                        (new Date(selectedDate).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days remaining
                    </p>
                  </div>

                  {/* Spot Price */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Current Spot Price
                    </h3>
                    <p className="text-xl">
                      ${optionsData.underlyingPrice.toFixed(2)}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        selectedOptionType === "calls"
                          ? optionsData.underlyingPrice > selectedOption.strike
                            ? "text-green-600"
                            : "text-red-600"
                          : optionsData.underlyingPrice < selectedOption.strike
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {selectedOptionType === "calls"
                        ? optionsData.underlyingPrice > selectedOption.strike
                          ? `$${(
                              optionsData.underlyingPrice -
                              selectedOption.strike
                            ).toFixed(2)} in-the-money`
                          : `$${(
                              selectedOption.strike -
                              optionsData.underlyingPrice
                            ).toFixed(2)} out-of-the-money`
                        : optionsData.underlyingPrice < selectedOption.strike
                        ? `$${(
                            selectedOption.strike - optionsData.underlyingPrice
                          ).toFixed(2)} in-the-money`
                        : `$${(
                            optionsData.underlyingPrice - selectedOption.strike
                          ).toFixed(2)} out-of-the-money`}
                    </p>
                  </div>

                  {/* Current Option Price */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Option Price
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl">
                        ${selectedOption.lastPrice.toFixed(2)}
                      </p>
                      <span
                        className={cn(
                          getChangeColor(selectedOption.percentChange),
                          "text-sm"
                        )}
                      >
                        {selectedOption.percentChange >= 0 ? "+" : ""}
                        {selectedOption.percentChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Market Information */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">Market Data</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <h4 className="text-xs text-muted-foreground">Bid</h4>
                        <p>${selectedOption.bid.toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground">Ask</h4>
                        <p>${selectedOption.ask.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Volume and Open Interest */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h3 className="text-xs text-muted-foreground">Volume</h3>
                      <p>{numberWithCommas(selectedOption.volume)}</p>
                    </div>
                    <div>
                      <h3 className="text-xs text-muted-foreground">
                        Open Interest
                      </h3>
                      <p>{numberWithCommas(selectedOption.openInterest)}</p>
                    </div>
                  </div>

                  {/* Model Pricing */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">Pricing Model</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <h4 className="text-xs text-muted-foreground">IV</h4>
                        <p>
                          {(selectedOption.impliedVolatility * 100).toFixed(1)}%
                        </p>
                      </div>

                      <div className="flex justify-between">
                        <h4 className="text-xs text-muted-foreground">
                          Model Price
                        </h4>
                        <p>${selectedOption.americanPrice.toFixed(2)}</p>
                      </div>

                      {selectedOption.earlyExerciseValue > 0.01 && (
                        <div className="flex justify-between">
                          <h4 className="text-xs text-muted-foreground">
                            Early Ex. Premium
                          </h4>
                          <p>${selectedOption.earlyExerciseValue.toFixed(3)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "text-sm p-3 rounded-md",
                      selectedOption.inTheMoney
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : "bg-gray-50 text-gray-800 border border-gray-200"
                    )}
                  >
                    {selectedOption.inTheMoney
                      ? "This option is currently in-the-money."
                      : "This option is currently out-of-the-money."}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-6"
                  onClick={() => setOptionDialogOpen(false)}
                >
                  Close
                </Button>
              </div>

              {/* Visualization Area */}
              <div className="flex-1 overflow-auto">
                <Tabs defaultValue="tree" className="w-full">
                  <div className="sticky top-0 bg-white dark:bg-gray-950 p-4 border-b z-10">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="tree">Binomial Tree</TabsTrigger>
                      <TabsTrigger value="surface">
                        Volatility Surface
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="tree" className="mt-0 p-4">
                    <ErrorBoundary
                      fallback={
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <p className="text-amber-600 font-medium mb-2">
                            Unable to generate binomial model for this option.
                          </p>
                          <p className="text-muted-foreground text-sm">
                            The basic option data is still available in the
                            table.
                          </p>
                        </div>
                      }
                    >
                      <BinomialTree
                        preselectedStrike={selectedOption.strike}
                        preselectedOptionType={
                          selectedOptionType === "calls" ? "call" : "put"
                        }
                      />
                    </ErrorBoundary>
                  </TabsContent>

                  <TabsContent value="surface" className="mt-0 p-4">
                    <ErrorBoundary
                      fallback={
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <p className="text-amber-600 font-medium mb-2">
                            Unable to generate volatility surface for this
                            option.
                          </p>
                          <p className="text-muted-foreground text-sm">
                            The basic option data is still available in the
                            table.
                          </p>
                        </div>
                      }
                    >
                      <VolatilitySurfaceChart
                        highlightStrike={selectedOption.strike}
                      />
                    </ErrorBoundary>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default OptionsChainView;
