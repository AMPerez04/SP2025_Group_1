"use client";

import React, { useState } from "react";
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SidebarFooterMenu() {
  const { isMobile } = useSidebar();
  const { user, resetUser, setError, setUser } = useStore((state) => state);
  const router = useRouter();

  // State to control the visibility of the settings modal.
  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  // Controls which field is being edited. When null, we show info.
  const [editingField, setEditingField] = useState<"username" | "email" | null>(
    null
  );

  // Form state for updating settings.
  const [newUsername, setNewUsername] = useState(user.name);
  const [newEmail, setNewEmail] = useState(user.email);
  const [password, setPassword] = useState("");

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

  // Handle submission for updating a single field.
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build payload based on which field is being updated.
    let payload: any = { password };
    if (editingField === "username") {
      payload.username = newUsername;
    } else if (editingField === "email") {
      payload.email = newEmail;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/update-settings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast("Settings updated successfully", {
          style: { borderLeft: "7px solid #2d9c41" },
          position: "bottom-right",
          icon: <UserCog width={30} />,
          duration: 2000,
        });
        // Update zustand user with the new data.
        if (editingField === "username") {
          setUser({ ...user, name: newUsername });
        } else if (editingField === "email") {
          setUser({ ...user, email: newEmail });
        }
        // Reset editing state and clear password field.
        setEditingField(null);
        setPassword("");
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings", {
        style: { borderLeft: "7px solid #d32f2f" },
        position: "bottom-right",
        duration: 2000,
      });
    }
  };

  // Reset the form and exit edit mode.
  const cancelEditing = () => {
    setEditingField(null);
    setPassword("");
    setNewUsername(user.name);
    setNewEmail(user.email);
  };

  return (
    <>
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
                <DropdownMenuItem onSelect={() => setOpenSettingsModal(true)}>
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

      {/* Settings Modal */}
      <Dialog open={openSettingsModal} onOpenChange={setOpenSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Manage your account details. Select a field below to update it—confirmation via your password is required.
            </DialogDescription>
          </DialogHeader>

          {editingField === null ? (
            // Show current info with action buttons.
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Username</span>
                <div className="flex items-center justify-between rounded bg-gray-100 p-3">
                  <span className="text-base font-medium">{user.name}</span>
                  <button
                    onClick={() => setEditingField("username")}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Change Username
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Email</span>
                <div className="flex items-center justify-between rounded bg-gray-100 p-3">
                  <span className="text-base font-medium">{user.email}</span>
                  <button
                    onClick={() => setEditingField("email")}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Change Email
                  </button>
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={() => setOpenSettingsModal(false)}
                  className="rounded bg-gray-200 px-4 py-2 text-sm"
                >
                  Close
                </button>
              </DialogFooter>
            </div>
          ) : (
            // Show the inline form for updating the selected field.
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {editingField === "username" ? "New Username" : "New Email"}
                </label>
                <input
                  type={editingField === "email" ? "email" : "text"}
                  value={editingField === "username" ? newUsername : newEmail}
                  onChange={(e) =>
                    editingField === "username"
                      ? setNewUsername(e.target.value)
                      : setNewEmail(e.target.value)
                  }
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>
              <DialogFooter className="space-x-4">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded bg-gray-200 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
                  Save
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
