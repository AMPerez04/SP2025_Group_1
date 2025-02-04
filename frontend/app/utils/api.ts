import axios from "axios";
import React from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getWatchList = async (userID: string) => {
  try {
    const response = await fetch(`http://127.0.0.1:8000/watchlist/${userID}`);
    const data = await response.json();
    return data.Tickers || [];
  } catch (error) {
    console.error("ERROR: Unable to get watchlist:", error);
    return [];
  }
};

export const addToWatchlist = async (
  userID: string,
  ticker: string,
  fullname: string,
  icon: string,
  setWatchlist: React.Dispatch<
    React.SetStateAction<{ Ticker: string; FullName: string; Icon: string }[]>
  >
) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/watchlist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserID: userID,
        Ticker: ticker,
        FullName: fullname,
        Icon: icon,
      }),
    });
    const data = await response.json();
    if (data.Tickers) {
      const updatedWatchlist = await getWatchList(userID);
      setWatchlist(updatedWatchlist);
      getWatchList(userID);
    }
  } catch (error) {
    console.error("ERROR: Unable to add ticker to watchlist:", error);
  }
};

export const removeFromWatchlist = async (
  userID: string,
  ticker: string,
  setWatchlist: React.Dispatch<
    React.SetStateAction<{ Ticker: string; FullName: string; Icon: string }[]>
  >
) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/watchlist/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserID: userID, Ticker: ticker }),
    });
    const data = await response.json();
    if (data.success) {
      const updatedWatchlist = await getWatchList(userID);
      setWatchlist(updatedWatchlist);
      getWatchList(userID);
    }
  } catch (error) {
    console.error("ERROR: Unable to remove from watchlist:", error);
  }
};
