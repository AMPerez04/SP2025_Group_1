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
import { removeFromWatchlist } from "@/app/utils/api";

export default function SidebarItems({
  watchlist,
  setWatchlist,
  userID,
}: {
  watchlist: { Ticker: string; FullName: string; Icon: string }[];
  setWatchlist: React.Dispatch<
    React.SetStateAction<{ Ticker: string; FullName: string; Icon: string }[]>
  >;
  userID: string;
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
      <SidebarMenu>
        {watchlist.map((item) => (
          <SidebarMenuItem key={item.Ticker}>
            <SidebarMenuButton asChild>
              <a>
                <BadgeDollarSign />
                <span>{item.Ticker}</span>
              </a>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              onClick={() =>
                removeFromWatchlist(userID, item.Ticker, setWatchlist)
              }
            >
              <Trash2 />
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
