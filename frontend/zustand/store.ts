import { create } from "zustand";
import { normalizeTime, periodIntervalMap, getYtdIntervals, Period, Interval } from "../lib/utils";

interface User {
  ID: string;
  email: string;
  avatar: string;
  name: string;
}

interface WatchlistItem {
  Ticker: string;
  FullName: string;
  Icon: string;
}

interface Asset {
  ticker: string;
  icon: string;
  full_name: string;
  market: string;
  country: string;
  country_flag: string;
}

interface Store {
  user: User;
  setUser: (newUser: User) => void;

  error: string | null;


  // watchlist items
  watchlist: WatchlistItem[];
  setWatchlist: (newWatchlist: WatchlistItem[]) => void;
  getWatchList: (ID: string) => Promise<void>;
  addToWatchlist: (
    ticker: string,
    fullname: string,
    icon: string
  ) => Promise<void>;
  removeFromWatchlist: (ticker: string) => Promise<void>;

  // watchlist financial data
  financialData: any;
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedInterval: Interval;
  setSelectedInterval: (interval: Interval) => void;
  fetchFinancialData: (ticker: string, period: Period, interval: Interval) => Promise<void>;

  // forecast data
  forecast: any;
  loading: boolean;
  fetchForecast: (ticker: string, period: Period, interval: Interval, steps?: number) => Promise<void>;


  // assets for searchbar
  assets: Asset[];
  getAssets: (searchQuery: string) => Promise<void>;
  setAssets: (newAssets: Asset[]) => void;

  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
}

interface DashboardState {
  selectedAsset: string;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volume: number;
  marketCap: number;
  peRatio: number;
}

export const useStore = create<Store>((set, get) => ({
  user: {
    ID: "67a2e2ca7d35e6dfd35f3b17",
    email: "jd@wustl.edu",
    avatar: "",
    name: "John Doe",
  },
  setUser: (newUser) => set({ user: newUser }),

  watchlist: [],
  setWatchlist: (newWatchlist) => {
    set({ watchlist: newWatchlist });

    if (!get().selectedAsset && newWatchlist.length > 0) {
      set({ selectedAsset: newWatchlist[0].Ticker });
    }
  },
  getWatchList: async (ID) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/watchlist/${ID}`);
      const data = await response.json();
      const tickers = data.Tickers || [];

      set({ watchlist: tickers });

      if (!get().selectedAsset && tickers.length > 0) {
        set({ selectedAsset: tickers[0].Ticker });
      }
    } catch (error) {
      console.error("ERROR: Unable to get watchlist:", error);
      set({ watchlist: [] });
    }
  },
  addToWatchlist: async (ticker, fullname, icon) => {
    try {
      const { ID } = get().user;
      const response = await fetch("http://127.0.0.1:8000/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ID: ID,
          Ticker: ticker,
          FullName: fullname,
          Icon: icon,
        }),
      });
      const data = await response.json();
      if (data.Tickers) {
        await get().getWatchList(ID);
      }
    } catch (error) {
      console.error("ERROR: Unable to add ticker to watchlist:", error);
    }


  },
  removeFromWatchlist: async (ticker) => {
    try {
      const { ID } = get().user;
      const response = await fetch("http://127.0.0.1:8000/watchlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ID: ID, Ticker: ticker }),
      });
      const data = await response.json();

      if (data.success) {
        await get().getWatchList(ID);

        if (get().selectedAsset === ticker) {
          set({ selectedAsset: get()?.watchlist[0]?.Ticker || "" });
        }
      }
    } catch (error) {
      console.error("ERROR: Unable to remove from watchlist:", error);
    }
  },
  financialData: {},
  fetchFinancialData: async (ticker, period = "1y" as Period, interval = "1d" as Interval) => {
    const validIntervals = period === 'ytd' ? getYtdIntervals() : periodIntervalMap[period];
    if (!validIntervals.includes(interval)) {
      console.warn(`Invalid interval ${interval} for period ${period}. Defaulting to ${validIntervals[0]}`);
      interval = validIntervals[0];
      set({ selectedInterval: interval });

    }

    console.log("Fetching financial data for:", { ticker, period, interval });
    try {
      set({ financialData: {} });

      const response = await fetch(`http://localhost:8000/data?ticker=${ticker}&period=${period}&interval=${interval}`);
      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        console.error('Error: rawData is undefined, null, or empty');
        set({ financialData: {} });
        return;
      }

      
      const transformedData = Object.keys(rawData).reduce((acc, asset) => {
        const assetData = rawData[asset];
        if (!assetData || !assetData.Close) return acc;

        acc[asset] = Object.keys(assetData.Close)
          .filter(dateKey => assetData.Close[dateKey] !== null) 
          .map(dateKey => ({
            time: normalizeTime(dateKey),
            value: assetData.Close[dateKey],
          }))
          .sort((a, b) => a.time - b.time);

        return acc;
      }, {} as Record<string, { time: number; value: number }[]>);

      if (Object.keys(transformedData).length === 0) {
        console.warn("Warning: Transformed data is empty");
        set({ financialData: {} });
        return;
      }

      set({ financialData: transformedData });

    } catch (error) {
      console.error('Error fetching watchlist financial data:', error);
      set({ financialData: {} });
    }
  },


  assets: [],
  setAssets: (newAssets) => set({ assets: newAssets }),
  getAssets: async (searchQuery) => {
    if (searchQuery.length < 1) return;
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/search?query=${searchQuery}`
      );
      const data = await response.json();
      set({ assets: data });
    } catch (error) {
      console.error("ERROR: Unable to fetch assets:", error);
      set({ assets: [] }); 
    }
  },

  selectedAsset: get()?.watchlist[0]?.Ticker || "",
  setSelectedAsset: (ticker) => set({ selectedAsset: ticker }),

  selectedPeriod: "1y",
  setSelectedPeriod: (period) => {
    const currentInterval = get().selectedInterval;
    const validIntervals = period === 'ytd' ? getYtdIntervals() : periodIntervalMap[period];
    if (!validIntervals.includes(currentInterval)) {
      set({
        selectedPeriod: period,
        selectedInterval: validIntervals[0]
      });
    } else {
      set({ selectedPeriod: period });
    }
  },

  selectedInterval: "1d",
  setSelectedInterval: (interval) => set({ selectedInterval: interval }),

  forecast: null,
  loading: false,
  error: null,
  fetchForecast: async (ticker, period = "1y", interval = "1d", steps = 30) => {
    if (!periodIntervalMap[period].includes(interval)) {
      console.warn(`Invalid interval ${interval} for period ${period}. Defaulting to ${periodIntervalMap[period][0]}`);
      interval = periodIntervalMap[period][0];
      set({ selectedInterval: interval });
    }
    console.log("Fetching forecast data for:", { ticker, period, interval, steps });
    set({ loading: true, error: null });
    try {
      const response = await fetch(`http://127.0.0.1:8000/predict_arima?ticker=${ticker}&period=${period}&interval=${interval}&steps=${steps}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      set({ forecast: data });
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      set({ error: "Error fetching forecast data" });
    } finally {
      set({ loading: false });
    }
  },
}));


