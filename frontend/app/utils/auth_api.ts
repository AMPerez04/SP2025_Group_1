// auth_api.ts
import { BACKEND_URL } from "@/zustand/store"; // adjust the import path as needed

export interface UserData {
  user: {
    user_id: string;
    email: string;
    username: string;
    // add other user properties if available
  };
  message: string;
}

export interface SignupResponse {
    message: string;
  }
  

/**
 * Logs in the user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The user data from the backend.
 * @throws An Error with an error message if the request fails.
 */
export async function login(email: string, password: string): Promise<UserData> {
  const res = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || res.statusText || "Login failed");
  }

  return res.json();
}

/**
 * Signs up the user.
 * @param email - The user's email.
 * @param username - The user's username.
 * @param password - The user's password.
 * @returns The response data from the backend.
 * @throws An Error with an error message if the request fails.
 */
export async function signup(email: string, username: string, password: string): Promise<SignupResponse> {
    const res = await fetch(`${BACKEND_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, username, password }),
    });
  
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || res.statusText || "Signup failed");
    }
  
    return res.json();
  }