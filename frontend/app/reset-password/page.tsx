"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { BACKEND_URL } from "@/zustand/store";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate that both passwords match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const payload = { token, email, password };

    try {
      const res = await fetch(`${BACKEND_URL}/reset-user-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "ERROR: Failed to reset password.");
      }

      setMessage("Password reset successfully!");
      // Optionally redirect to the login page
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  };

  // Show a loading state if token or email are missing
  if (!token || !email) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-r from-[#8e2de2] to-[#4a00e0]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-white w-full max-w-lg py-12 px-8 rounded-[2rem]"
        aria-labelledby="form-title"
      >
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
            Reset Password
          </h1>
          <p>Please enter your new password.</p>
        </div>

        {/* Display error or success message */}
        {errorMessage && (
          <div className="text-red-500 text-center font-semibold">
            {errorMessage}
          </div>
        )}
        {message && (
          <div className="text-green-500 text-center font-semibold">
            {message}
          </div>
        )}

        {/* New Password Field */}
        <div className="relative pt-[0.9375rem] mb-2">
          <input
            type="password"
            id="password"
            name="password"
            placeholder=" "
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
            New Password
          </label>
        </div>

        {/* Confirm New Password Field */}
        <div className="relative pt-[0.9375rem] mb-2">
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder=" "
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="peer text-2xl text-[#1F2346] py-1.5 w-full pr-10 border-b-[3px] border-b-[#D1D1D1] bg-transparent transition-colors duration-200 focus:border-b-[#605DFF] outline-none"
          />
          <label
            htmlFor="confirmPassword"
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
            Confirm New Password
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-[#605DFF] hover:bg-[#4a00e0] text-white font-extrabold text-xl flex justify-center items-center mt-4 py-3 min-h-[3.125rem] w-full rounded-full transition-all duration-300"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
