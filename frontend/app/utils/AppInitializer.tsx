"use client";

import { useEffect } from "react";
import { useStore, BACKEND_URL } from "@/zustand/store";
import { useRouter } from "next/navigation";

export default function AppInitializer() {
  const setUser = useStore((state) => state.setUser);
  const router = useRouter();

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
          router.push("/");
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    };

    fetchSession();
  }, [setUser, router]);

  return null; // This component only handles initialization
}
