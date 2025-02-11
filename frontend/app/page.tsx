"use client";

import React, { useState, useEffect} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/zustand/store"; // adjust as needed
import { login, signup } from "@/app/utils/auth_api"; // adjust the path as needed
import { BACKEND_URL } from "@/zustand/store";

export default function Page() {
  // Toggle between "login" and "signup" mode.
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Local state for controlled inputs.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Only needed in signup mode.
  const [username, setUsername] = useState("");

  // Error state to store any error messages.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the setUser method from our Zustand store.
  const setUser = useStore((state) => state.setUser);

  // Next.js router for redirection.
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/session`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.user) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    };

    fetchSession();
  }, [setUser, router]);

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));

    // Clear the form fields and error message when switching modes.
    setEmail("");
    setPassword("");
    setUsername("");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear any previous error message.
    setErrorMessage(null);

    try {
      if (mode === "login") {
        // Call login API from auth_api.ts
        const data = await login(email, password);

        // The backend returns: { message, user: { email, username, user_id } }
        setUser({
          ID: data.user.user_id,
          email: data.user.email,
          name: data.user.username,
          avatar: "", // add an avatar URL if available
        });
        router.push("/dashboard");
      } else {

        // Signup mode
        await signup(email, username, password);

        // After successful signup, automatically log the user in.
        const data = await login(email, password);
        setUser({
          ID: data.user.user_id,
          email: data.user.email,
          name: data.user.username,
          avatar: "",
        });
        router.push("/survey");
      }
    } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
          console.error("Auth error:", err);
        } else {
          setErrorMessage("An unexpected error occurred. Please try again.");
          console.error("Auth error:", err);
        }
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-r from-[#8e2de2] to-[#4a00e0]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-white w-full max-w-lg py-12 px-8 rounded-[2rem]"
        aria-labelledby="form-title"
      >
        {/* Logo & Welcome */}
        <div className="mb-4 text-center">
          <a href="#" title="Logo">
            <Image
              src="/assets/placeholder.png"
              alt="Logo"
              width={48}
              height={48}
              priority
              className="mx-auto h-12"
            />
          </a>
          <h1 id="form-title" className="text-2xl font-bold mt-4">
            {mode === "login" ? "Welcome back 👏" : "Create an account"}
          </h1>
          <p>
            {mode === "login"
              ? "Please enter your details!"
              : "Please fill in your details to sign up!"}
          </p>
        </div>

        {/* Display Error Message */}
        {errorMessage && (
          <div className="text-red-500 text-center font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Additional Field for Signup */}
        {mode === "signup" && (
          <div className="relative pt-[0.9375rem] mb-2">
            <input
              type="text"
              id="username"
              name="username"
              placeholder=" "
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="peer text-2xl text-[#1F2346] py-1.5 w-full pr-10 border-b-[3px] border-b-[#D1D1D1] bg-transparent transition-colors duration-200 focus:border-b-[#605DFF] outline-none"
            />
            <label
              htmlFor="username"
              className="absolute left-0 bg-white pointer-events-none transition-all duration-300
                peer-placeholder-shown:top-[1.2rem]
                peer-placeholder-shown:text-[1.2rem]
                peer-focus:top-[-0.8rem]
                peer-focus:text-[1.2rem]
                peer-focus:text-[#605DFF]
                peer-[&:not(:placeholder-shown)]:top-[-0.8rem]
                peer-[&:not(:placeholder-shown)]:text-[1.2rem]
                peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
            >
              Username
            </label>
            <div
              className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 transition-colors duration-200
                peer-placeholder-shown:text-[#1F2346]
                peer-focus:text-[#605DFF]
                peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="relative pt-[0.9375rem] mb-2">
          <input
            type="email"
            id="email"
            name="email"
            placeholder=""
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="peer text-2xl text-[#1F2346] py-1.5 w-full pr-10 border-b-[3px] border-b-[#D1D1D1] bg-transparent transition-colors duration-200 focus:border-b-[#605DFF] outline-none"
          />
          <label
            htmlFor="email"
            className="absolute left-0 bg-white pointer-events-none transition-all duration-300
              peer-placeholder-shown:top-[1.2rem]
              peer-placeholder-shown:text-[1.2rem]
              peer-focus:top-[-0.8rem]
              peer-focus:text-[1.2rem]
              peer-focus:text-[#605DFF]
              peer-[&:not(:placeholder-shown)]:top-[-0.8rem]
              peer-[&:not(:placeholder-shown)]:text-[1.2rem]
              peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
          >
            Email
          </label>
          {/* Email Icon */}
          <div
            className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 transition-colors duration-200
              peer-placeholder-shown:text-[#1F2346]
              peer-focus:text-[#605DFF]
              peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26c.59.39 1.31.39 1.9 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Password Input */}
        <div className="relative pt-[0.9375rem] mb-2">
          <input
            id="password"
            type="password"
            placeholder=" "
            title="Minimum 6 characters at least 1 Alphabet, 1 Number and 1 Symbol"
            pattern="^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{6,}$"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer text-2xl text-[#1F2346] py-1.5 w-full pr-10 border-b-[3px] border-b-[#D1D1D1] bg-transparent transition-colors duration-200 focus:border-b-[#605DFF] outline-none"
          />
          <label
            htmlFor="password"
            className="absolute left-0 bg-white pointer-events-none transition-all duration-300
              peer-placeholder-shown:top-[1.2rem]
              peer-placeholder-shown:text-[1.2rem]
              peer-focus:top-[-0.8rem]
              peer-focus:text-[1.2rem]
              peer-focus:text-[#605DFF]
              peer-[&:not(:placeholder-shown)]:top-[-0.8rem]
              peer-[&:not(:placeholder-shown)]:text-[1.2rem]
              peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
          >
            Password
          </label>
          <div
            className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 transition-colors duration-200
              peer-placeholder-shown:text-[#1F2346]
              peer-focus:text-[#605DFF]
              peer-[&:not(:placeholder-shown)]:text-[#605DFF]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 11V7a4 4 0 018 0v4M6 11h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"
              />
            </svg>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-[#605DFF] hover:bg-[#4a00e0] text-white font-extrabold text-xl flex justify-center items-center mt-4 py-3 min-h-[3.125rem] w-full rounded-full transition-all duration-300"
        >
          {mode === "login" ? "Login" : "Sign Up"}
        </button>

        {/* Toggle Mode */}
        <div className="flex flex-col items-center text-[#919191] gap-4 mt-2">
          <div className="flex gap-2 justify-center w-full">
            <span>
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              title={mode === "login" ? "Create Account" : "Sign In"}
              className="text-[#515151] font-semibold hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
