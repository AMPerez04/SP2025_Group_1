"use client";

import React from "react";
import { CaretSortIcon } from "@radix-ui/react-icons";
import {
  LogOut,
  Settings,
  Lightbulb,
  UserCog,
  TriangleAlert,
} from "lucide-react";
import initials from "initials";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStore, BACKEND_URL } from "@/zustand/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SidebarFooterMenu() {
  const { isMobile } = useSidebar();
  const { user, resetUser, setError } = useStore((state) => state);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call the backend logout endpoint.
      const res = await fetch(`${BACKEND_URL}/logout`, {
        method: "POST",
        credentials: "include", // ensures cookies are sent/received
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        // Reset local state and redirect if logout succeeded.
        resetUser();
        router.push("/");
      } else {
        throw new Error("ERROR: Failed logout");
      }
    } catch (error) {
      console.error("ERROR: Failed logout:", error);
      setError(`Unable to log out`);
    }

    const storeError = useStore.getState().errorMessage;

    if (!storeError) {
      // success toast notification: user logged out
      toast("Logged out successfully", {
        description: "Your data has been saved",
        style: {
          borderLeft: "7px solid #2d9c41",
        },
        position: "bottom-right",
        icon: <UserCog width={30} />,
        duration: 2000,
      });
    } else {
      // error toast notification: user not logged out
      toast.error("ERROR", {
        description: storeError,
        style: {
          borderLeft: "7px solid #d32f2f",
        },
        position: "bottom-right",
        icon: <TriangleAlert width={30} />,
        cancel: {
          label: "Try again",
          onClick: () => handleLogout(),
        },
        duration: 2000,
      });

      // clear error message
      setError("");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <CaretSortIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Lightbulb />
                Theme
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                handleLogout();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
