import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { useStore } from "@/zustand/store";
import Link from "next/link";

export function AssetInfo() {
  const {
    selectedAsset,
    quoteData,
    getQuote,
    descriptionData,
    getDescription,
  } = useStore((state) => state);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  useEffect(() => {
    if (selectedAsset) {
      getQuote(selectedAsset.ticker);
      getDescription(selectedAsset.ticker);
      setDescriptionOpen(false);
    }
  }, [selectedAsset, getQuote, getDescription]);

  if (!selectedAsset || !quoteData || !descriptionData) return <></>;

  const assetInfo = [
    { label: "Previous Close", value: quoteData.previousClose },
    { label: "Open", value: quoteData.open },
    { label: "Bid", value: quoteData.bid },
    { label: "Ask", value: quoteData.ask },
    { label: "Day's Range", value: quoteData.daysRange },
    { label: "52 Week Range", value: quoteData.week52Range },
    { label: "Volume", value: quoteData.volume },
    { label: "Avg. Volume", value: quoteData.averageVolume },
    { label: "Market Cap (Intraday)", value: quoteData.marketCap },
    { label: "Beta (5Y Monthly)", value: quoteData.beta },
    { label: "PE Ratio (TTM)", value: quoteData.peRatio },
    { label: "EPS (TTM)", value: quoteData.eps },
    { label: "Earnings Date", value: quoteData.earningsDate },
    { label: "Forward Dividend & Yield", value: quoteData.dividendYield },
    { label: "Ex-Dividend Date", value: quoteData.exDividendDate },
    { label: "1Y Target Est", value: quoteData.targetEst },
  ];

  const ROW_LENGTH = 3;
  const columnCount = Math.ceil(assetInfo.length / ROW_LENGTH);
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
    return assetInfo.filter((_, index) => index % columnCount === columnIndex);
  });

  return (
    <div className="w-full space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{selectedAsset.ticker} Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            {Array.from({ length: ROW_LENGTH }, (_, rowIndex) => (
              <div key={rowIndex} className="flex flex-col gap-y-3">
                {columns.map((column, colIndex) => {
                  const item = column[rowIndex];
                  return (
                    item && (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        className="flex justify-between border-b border-dashed pb-1 mb-1"
                      >
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    )
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>About {descriptionData.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 items-start">
          <div className="w-8/12">
            <Collapsible
              open={descriptionOpen}
              onOpenChange={setDescriptionOpen}
            >
              <div className="flex flex-col space-y-2">
                <p
                  className={`text-sm text-muted-foreground mb-1 ${
                    descriptionOpen ? "" : "line-clamp-6"
                  }`}
                >
                  {descriptionData.description}
                </p>
                {descriptionData.description.length > 500 && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span>{descriptionOpen ? "Show less" : "Show more"}</span>
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
            </Collapsible>
            <Link href={descriptionData.website} passHref>
              <Button className="mt-4 bg-button-foreground hover:bg-button-background text-accent text-xs px-3 py-2 rounded-lg">
                Learn More
              </Button>
            </Link>
          </div>
          <div className="w-6/12 grid grid-cols-2 gap-x-6 gap-y-10 text-sm border-l-2 border-gray-300 pl-4 self-start pb-5">
            <div>
              <span className="font-semibold text-md">
                {descriptionData.sector}
              </span>
              <div className="text-muted-foreground">Sector</div>
            </div>
            <div>
              <span className="font-semibold text-md">
                {descriptionData.industry}
              </span>
              <div className="text-muted-foreground">Industry</div>
            </div>
            <div>
              <span className="font-semibold text-md">
                {descriptionData.employees}
              </span>
              <div className="text-muted-foreground">Employees</div>
            </div>
            <div>
              <span className="font-semibold text-md">
                {descriptionData.nextFiscalYearEnd}
              </span>
              <div className="text-muted-foreground">Fiscal Year Ends</div>
            </div>
            <div>
              <span className="font-semibold text-md">
                {descriptionData.location}
              </span>
              <div className="text-muted-foreground">Headquarters</div>
            </div>
            <div>
              <span className="font-semibold text-md">
                {descriptionData.leadership}
              </span>
              <div className="text-muted-foreground">Leadership</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AssetInfo;
