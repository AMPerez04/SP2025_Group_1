"use client";

import * as React from "react";

import { DashboardIcon } from "@radix-ui/react-icons";

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function Product() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center space-x-4">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <DashboardIcon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">ProfitProphet</span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
