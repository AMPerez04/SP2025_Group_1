"use client";

import React from "react";
import { Trash2, BadgeDollarSign, TriangleAlert } from "lucide-react";
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
  const {
    watchlist,
    removeFromWatchlist,
    setSelectedAsset,
    selectedAsset,
    setError,
  } = useStore((state) => state);
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
                removeFromWatchlist(item.Ticker).then(() => {
                  const storeError = useStore.getState().errorMessage;

                  if (!storeError) {
                    // success toast notification: asset removed from watchlist
                    toast(`${item.Ticker} was removed from your watchlist`, {
                      style: {
                        borderLeft: "7px solid #2d9c41",
                      },
                      position: "bottom-right",
                      description: item.FullName,
                      icon: <Trash2 width={30} />,
                      duration: 2000,
                    });
                  } else {
                    // error toast notification: asset not removed from watchlist
                    toast.error("ERROR", {
                      description: storeError,
                      style: {
                        borderLeft: "7px solid #d32f2f",
                      },
                      position: "bottom-right",
                      icon: <TriangleAlert width={30} />,
                      duration: 2000,
                    });

                    // clear error message
                    setError("");
                  }
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
