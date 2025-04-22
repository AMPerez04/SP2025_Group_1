"use client";

import React, { useState } from "react";
import {
  Trash2,
  BadgeDollarSign,
  TriangleAlert,
  Landmark,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useStore } from "@/zustand/store";
import { toast } from "sonner";

export default function SidebarItems() {
  const {
    watchlist,
    removeFromWatchlist,
    setSelectedAsset,
    selectedAsset,
    setError,
    setSelectedMarket,
  } = useStore((state) => state);

  const [openMarkets, setOpenMarkets] = useState<Record<string, boolean>>({});

  const groupedWatchlist = watchlist.reduce((group, asset) => {
    const market = asset.MarketName;

    if (!group[market]) {
      group[market] = [];
    }

    group[market].push(asset);

    return group;
  }, {} as { [market: string]: (typeof watchlist)[number][] });

  const toggleMarket = (market: string) =>
    setOpenMarkets((prev) => ({
      ...prev,
      [market]: !prev[market],
    }));

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
      <SidebarMenu>
        {Object.entries(groupedWatchlist)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([market, assets]) => (
            <Collapsible
              key={market}
              open={openMarkets[market]}
              onOpenChange={() => toggleMarket(market)}
              asChild
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={(e) => {
                      if (e.detail === 1) {
                        setTimeout(() => {
                          // single click --> open/close toggle
                        }, 200);
                      } else if (e.detail === 2) {
                        // double click --> select market
                        setSelectedMarket(market);
                      }
                    }}
                  >
                    <Landmark />
                    <span>{market}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {assets.map((item) => (
                      <SidebarMenuSubItem key={item.Ticker}>
                        <div className="relative group">
                          <SidebarMenuSubButton
                            isActive={selectedAsset?.ticker === item.Ticker}
                            onClick={() => {
                              setSelectedAsset({
                                assetLogo: item.Icon,
                                companyName: item.FullName,
                                ticker: item.Ticker,
                                marketName: item.MarketName,
                                marketLogo: item.MarketLogo,
                              });
                            }}
                            className={
                              selectedAsset?.ticker === item.Ticker
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : ""
                            }
                          >
                            <BadgeDollarSign />
                            <span>{item.Ticker}</span>
                          </SidebarMenuSubButton>
                          <SidebarMenuAction
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                            onClick={() => {
                              removeFromWatchlist(item.Ticker).then(() => {
                                const storeError =
                                  useStore.getState().errorMessage;

                                if (!storeError) {
                                  toast(
                                    `${item.Ticker} was removed from your watchlist`,
                                    {
                                      style: {
                                        borderLeft: "7px solid #2d9c41",
                                      },
                                      position: "bottom-right",
                                      description: item.FullName,
                                      icon: <Trash2 width={30} />,
                                      duration: 2000,
                                    }
                                  );
                                } else {
                                  toast.error("ERROR", {
                                    description: storeError,
                                    style: { borderLeft: "7px solid #d32f2f" },
                                    position: "bottom-right",
                                    icon: <TriangleAlert width={30} />,
                                    duration: 2000,
                                  });
                                  setError("");
                                }
                              });
                            }}
                          >
                            <Trash2 />
                          </SidebarMenuAction>
                        </div>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
