"use client";

import React from "react";
import { Trash2, BadgeDollarSign, DollarSign } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore } from "@/zustand/store";
import { toast } from "sonner";

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
              onClick={() => {
                removeFromWatchlist(item.Ticker);
                toast(`${item.Ticker} was removed from your watchlist`, {
                  style: {
                    borderLeft: "7px solid #e22e29",
                  },
                  position: "bottom-right",
                  description: item.FullName,
                  icon: <DollarSign width={25} />,
                });
              }}
            >
              <Trash2 />
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
