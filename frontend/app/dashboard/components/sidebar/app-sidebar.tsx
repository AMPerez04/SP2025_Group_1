"use client";

import * as React from "react";

import { BadgeDollarSign } from "lucide-react";

import { Product } from "@/app/dashboard/components/sidebar/product";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import SidebarFooterMenu from "./sidebar-footer-menu";
import SidebarItems from "./sidebar-items";
import { SearchBar } from "./searchbar";

// hard-coded data TODO: replace w/ API fetch
const user = {
  name: "John Doe",
  email: "jd@wustl.edu",
  avatar: "", // image URL (optional) | default avatar: user's initials
};

const items = [
  {
    name: "$AAPL",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$TSLA",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$GOOGL",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$AMZN",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$MSFT",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$META",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$NFLX",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$NVDA",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$SPY",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$DIS",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$PYPL",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$V",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$INTC",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$CSCO",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$BA",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$AMD",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$CRM",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$PFE",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$JNJ",
    url: "#",
    icon: BadgeDollarSign,
  },
  {
    name: "$KO",
    url: "#",
    icon: BadgeDollarSign,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Project Name */}
        <Product />
      </SidebarHeader>
      <SidebarContent>
        {/* Search Bar */}
        <SearchBar />
        {/* Watchlist */}
        <SidebarItems items={items} />
      </SidebarContent>
      <SidebarFooter>
        {/* User */}
        <SidebarFooterMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
