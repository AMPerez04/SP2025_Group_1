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
  // user info
  user: User;
  setUser: (newUser: User) => void;
  resetUser: () => void;



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

  // toast notification error message
  errorMessage: string;
  setError: (errorMessage: string) => void;
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

    // if no asset currently selected --> select 1st asset in the watchlist
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
  // gets user's watchlist
  getWatchList: async (ID) => {
    try {
      const response = await fetch(`${BACKEND_URL}/watchlist/${ID}`, {
        credentials: "include",
      });
      const data = await response.json();
      const tickers = data.Tickers || [];

      set({ watchlist: tickers });

      // if no asset currently selected --> select 1st asset in the watchlist
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
      set({ watchlist: [] }); // if error --> display an empty watchlist
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
      } else {
        throw new Error("ERROR: Unable to add ticker to watchlist");
      }
    } catch (error) {
      console.error(`ERROR: Unable to add $${ticker} to watchlist:`, error);
    }


  },
  // removes asset from user's watchlist
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
      } else {
        throw new Error("ERROR: Unable to remove ticker from watchlist");
      }
    } catch (error) {
      console.error(`ERROR: Unable to remove $${ticker} from watchlist:`, error);
    }
  },
  financialData: {},
  fetchFinancialData: async (ticker, period = "1y" as Period, interval = "1d" as Interval) => {
    const validIntervals = period === 'ytd' ? getYtdIntervals() : periodIntervalMap[period];
    if (!validIntervals.includes(interval)) {
      interval = validIntervals[0];
      set({ selectedInterval: interval });

    }

    try {
      set({ financialData: {} });

      const response = await fetch(`${BACKEND_URL}/data?ticker=${ticker}&period=${period}&interval=${interval}`);
      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        throw new Error('ERROR: rawData is undefined, null, or empty');
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
        throw new Error('ERROR: transformedData is empty');
      }

      set({ financialData: transformedData });

    } catch (error) {
      console.error('Error fetching watchlist financial data:', error);
      set({ financialData: {} });
      return;
    }
  },


  assets: [],
  setAssets: (newAssets) => set({ assets: newAssets }),
  // gets all assets matching search query
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
  fetchForecast: async (ticker, period = "1y", interval = "1d") => {
    if (!periodIntervalMap[period].includes(interval)) {
      interval = periodIntervalMap[period][0];
      set({ selectedInterval: interval });
    }
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

      
      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        throw new Error('Error: rawData is undefined, null, or empty');
      }

      const normalizedData = Object.keys(rawData).reduce((acc, asset) => {
        acc[asset] = rawData[asset].map((point: { time: string; value: number }) => ({
          time: normalizeTime(point.time),
          value: point.value,
        }));
        return acc;
      }, {} as Record<string, { time: number; value: number }[]>);

      // Set the forecastData in the same style it was served before
      set({ forecastData: normalizedData });
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      set({ forecastData: null });
    } finally {
      set({ loading: false });
    }
  },
  errorMessage: "",
  setError: (errorMessage) => set({ errorMessage }),
}));


