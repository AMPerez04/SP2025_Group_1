"use client";

import React from "react";
import { Trash2, BadgeDollarSign } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore } from "@/zustand/store";

export default function SidebarItems() {
  const { watchlist, removeFromWatchlist, setSelectedAsset, selectedAsset } =
    useStore((state) => state);
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
      <SidebarMenu>
        {watchlist.map((item) => (
          <SidebarMenuItem key={item.Ticker}>
            <SidebarMenuButton
              asChild
              onClick={() => {
                const asset = watchlist.find((a) => a.Ticker === item.Ticker);
                if (asset) {
                  setSelectedAsset({
                    assetLogo: asset.Icon,
                    companyName: asset.FullName,
                    ticker: asset.Ticker,
                    marketName: asset.MarketName,
                    marketLogo: asset.MarketLogo,
                  });
                }
              }}
              className={
                selectedAsset?.ticker === item.Ticker
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : ""
              }
            >
              <a>
                <BadgeDollarSign />
                <span>{item.Ticker}</span>
              </a>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              onClick={() => removeFromWatchlist(item.Ticker)}
            >
              <Trash2 />
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
