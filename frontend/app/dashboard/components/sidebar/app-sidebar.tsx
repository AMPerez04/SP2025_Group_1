"use client";

import * as React from "react";
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
import { useState, useEffect } from "react";
import { getWatchList } from "@/app/utils/api";

// hard-coded data TODO: replace w/ API fetch
const user = {
  name: "John Doe",
  email: "jd@wustl.edu",
  avatar: "", // image URL (optional) | default avatar: user's initials
  id: "USER2_watchlist_testing",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [watchlist, setWatchlist] = useState<
    { Ticker: string; FullName: string; Icon: string }[]
  >([]);

  // initial fetch of watchlist
  useEffect(() => {
    const fetchWatchlist = async () => {
      const data = await getWatchList(user.id);
      setWatchlist(data);
    };
    fetchWatchlist();
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* project name */}
        <Product />
      </SidebarHeader>
      <SidebarContent>
        {/* search bar */}
        <SearchBar setWatchlist={setWatchlist} />
        {/* watchlist */}
        <SidebarItems
          watchlist={watchlist}
          setWatchlist={setWatchlist}
          userID={user.id}
        />
      </SidebarContent>
      <SidebarFooter>
        {/* user account */}
        <SidebarFooterMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
