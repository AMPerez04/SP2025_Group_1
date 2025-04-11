"use client";

import React, { ReactNode } from "react";
import { AppSidebar } from "@/app/dashboard/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useStore } from "@/zustand/store";

interface LayoutProps {
  readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { selectedAsset, selectedMarket } = useStore((state) => state);

  return (
    <main>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="mx-auto max-w-screen-2xl">
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  {selectedAsset ? (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>${selectedAsset.ticker}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : selectedMarket ? (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{selectedMarket}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="p-4 pt-0">
            {selectedAsset ? (
              children
            ) : (
              <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                <h2 className="text-2xl font-semibold text-gray-500">
                  Add stocks to your watchlist to view the dashboard
                </h2>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}
