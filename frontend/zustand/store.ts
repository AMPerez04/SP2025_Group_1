import { create } from "zustand";
import { normalizeTime, periodIntervalMap, getYtdIntervals, Period, Interval } from "../lib/utils";

export const BACKEND_URL = "http://localhost:8000"

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
  MarketName: string;
  MarketLogo: string;
}

interface Asset {
  ticker: string;
  icon: string;
  full_name: string;
  market_name: string;
  market_logo: string;
  country: string;
  country_flag: string;
}

interface SelectedAsset {
  assetLogo: string;
  companyName: string;
  ticker: string;
  marketName: string;
  marketLogo: string;
}

export interface TimeSeriesPoint {
  time: number;
  value: number;
}

export type TimeSeriesData = Record<string, TimeSeriesPoint[]>;

interface Store {
  user: User;
  setUser: (newUser: User) => void;
  resetUser: () => void;

  error: string | null;


  // watchlist items
  watchlist: WatchlistItem[];
  setWatchlist: (newWatchlist: WatchlistItem[]) => void;
  getWatchList: (ID: string) => Promise<void>;
  addToWatchlist: (
    ticker: string,
    fullname: string,
    icon: string,
    market_name: string,
    market_logo: string
  ) => Promise<void>;
  removeFromWatchlist: (ticker: string) => Promise<void>;

  // watchlist financial data
  financialData: TimeSeriesData;
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedInterval: Interval;
  setSelectedInterval: (interval: Interval) => void;
  fetchFinancialData: (ticker: string, period: Period, interval: Interval) => Promise<void>;

  // forecast data
  forecastData: TimeSeriesData | null;
  loading: boolean;
  fetchForecast: (ticker: string, period: Period, interval: Interval) => Promise<void>;


  // assets for searchbar
  assets: Asset[];
  getAssets: (searchQuery: string) => Promise<void>;
  setAssets: (newAssets: Asset[]) => void;

  selectedAsset: SelectedAsset | null;
  setSelectedAsset: (asset: SelectedAsset) => void;
}

export const useStore = create<Store>((set, get) => ({
  user: {
    ID: "",
    email: "",
    avatar: "",
    name: "",
  },
  setUser: (newUser) => set({ user: newUser }),
  resetUser: () =>
    set({
      user: {
        ID: "",
        email: "",
        avatar: "",
        name: "",
      },
    }),

  watchlist: [],
  setWatchlist: (newWatchlist) => {
    set({ watchlist: newWatchlist });

    if (!get().selectedAsset && newWatchlist.length > 0) {
      set({
        selectedAsset: {
          assetLogo: newWatchlist[0].Icon,
          companyName: newWatchlist[0].FullName,
          ticker: newWatchlist[0].Ticker,
          marketName: newWatchlist[0].MarketName,
          marketLogo: newWatchlist[0].MarketLogo,
        },
      });
    }
  },
  getWatchList: async (ID) => {
    try {
      const response = await fetch(`${BACKEND_URL}/watchlist/${ID}`, {
        credentials: "include",
      });
      const data = await response.json();
      const tickers = data.Tickers || [];

      set({ watchlist: tickers });

      if (!get().selectedAsset && tickers.length > 0) {
        set({
          selectedAsset: {
            assetLogo: tickers[0].Icon,
            companyName: tickers[0].FullName,
            ticker: tickers[0].Ticker,
            marketName: tickers[0].MarketName,
            marketLogo: tickers[0].MarketLogo,
          },
        });
      }
    } catch (error) {
      console.error("ERROR: Unable to get watchlist:", error);
      set({ watchlist: [] });
    }
  },
  // adds asset to user's watchlist
  addToWatchlist: async (ticker, fullname, icon, market_name, market_logo) => {
    try {
      const { ID } = get().user;
      const response = await fetch(`${BACKEND_URL}/watchlist/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ID: ID,
          Ticker: ticker,
          FullName: fullname,
          Icon: icon,
          MarketName: market_name,
          MarketLogo: market_logo,
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
      const response = await fetch(`${BACKEND_URL}/watchlist/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ID: ID, Ticker: ticker }),
      });
      const data = await response.json();

      if (data.success) {
        await get().getWatchList(ID);

        // if removed asset was selected --> select 1st asset in the watchlist
        if (get().selectedAsset?.ticker === ticker) {
          set({
            selectedAsset: get()?.watchlist[0]
              ? {
                assetLogo: get()?.watchlist[0].Icon,
                companyName: get()?.watchlist[0].FullName,
                ticker: get()?.watchlist[0].Ticker,
                marketName: get()?.watchlist[0].MarketName,
                marketLogo: get()?.watchlist[0].MarketLogo,
              }
              : null,
          });
        }
      }
    } catch (error) {
      console.error("ERROR: Unable to remove from watchlist:", error);
      get().setError(`Unable to remove $${ticker} from your watchlist`);
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

      const response = await fetch(`${BACKEND_URL}/data?ticker=${ticker}&period=${period}&interval=${interval}`);
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
        `${BACKEND_URL}/search?query=${searchQuery}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      set({ assets: data });
    } catch (error) {
      console.error("ERROR: Unable to fetch assets:", error);
      set({ assets: [] });
    }
  },

  selectedAsset: null,
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

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

  forecastData: {},
  loading: false,
  error: null,
  fetchForecast: async (ticker, period = "1y", interval = "1d") => {
    if (!periodIntervalMap[period].includes(interval)) {
      console.warn(`Invalid interval ${interval} for period ${period}. Defaulting to ${periodIntervalMap[period][0]}`);
      interval = periodIntervalMap[period][0];
      set({ selectedInterval: interval });
    }
    console.log("Fetching forecast data for:", { ticker, period, interval });
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${BACKEND_URL}/predict_arima?ticker=${ticker}&period=${period}&interval=${interval}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      // const data = await response.json();
      // 
      // set({ forecastData: data });
      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        console.error('Error: rawData is undefined, null, or empty');
        set({ forecastData: null });
        return;
      }

      // Apply normalizeTime to the data
      const normalizedData = Object.keys(rawData).reduce((acc, asset) => {
        acc[asset] = rawData[asset].map((point: any) => ({
          time: normalizeTime(point.time),
          value: point.value,
        }));
        return acc;
      }, {} as Record<string, { time: number; value: number }[]>);

      // Log the normalized data for debugging
      console.log("Normalized forecast data:", normalizedData);

      // Set the forecastData in the same style it was served before
      set({ forecastData: normalizedData });
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      set({ error: "Error fetching forecast data" });
    } finally {
      set({ loading: false });
    }
  },
}));