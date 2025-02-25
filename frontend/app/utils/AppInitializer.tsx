"use client";

import { useEffect } from "react";
import { useStore, BACKEND_URL } from "@/zustand/store";
import { useRouter, usePathname } from "next/navigation";

export default function AppInitializer() {
  const setUser = useStore((state) => state.setUser);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/session`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.user) {
          setUser({
            ID: data.user.user_id,
            email: data.user.email,
            name: data.user.username,
            avatar: "", // Add avatar if available
          });
        } else {
          // Optionally redirect to login if no user is found
          if (pathname !== "/reset-password") {
            router.push("/");
          }
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    };

    fetchSession();
  }, [setUser, router, pathname]);

  return null; // This component only handles initialization
}
