"use client";

import * as React from "react";
import { useEffect } from "react";
import { Product } from "@/app/dashboard/components/sidebar/product";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import SidebarFooterMenu from "./sidebar-footer-menu";
import SidebarItems from "./watchlist";
import { SearchBar } from "./searchbar";
import { useStore } from "@/zustand/store";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { getWatchList, user } = useStore((state) => state);

  // initial fetch of watchlist
  useEffect(() => {
    if (user.ID) {
      getWatchList(user.ID);
    }
  }, [getWatchList, user.ID]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* project name */}
        <Product />
      </SidebarHeader>
      <SidebarContent>
        {/* search bar */}
        <SearchBar />
        {/* watchlist */}
        <SidebarItems />
      </SidebarContent>
      <SidebarFooter>
        {/* user account */}
        <SidebarFooterMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
