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

// hard-coded data TODO: replace w/ API fetch
const user = {
  name: "John Doe",
  email: "jd@wustl.edu",
  avatar: "", // image URL (optional) | default avatar: user's initials
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Project Name */}
        <Product />
      </SidebarHeader>
      <SidebarContent />
      <SidebarFooter>
        {/* User */}
        <SidebarFooterMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
