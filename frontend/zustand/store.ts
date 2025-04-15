import { create } from "zustand";
import {
  normalizeTime,
  periodIntervalMap,
  getYtdIntervals,
  Period,
  Interval,
} from "../lib/utils";

export const BACKEND_URL = "http://localhost:8000";

interface User {
  ID: string;
  email: string;
  avatar: string;
  name: string;
  snaptradeToken?: string; 
  snaptradeLinked?: boolean; 
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

interface QuoteData {
  previousClose: string;
  open: string;
  bid: string;
  ask: string;
  daysRange: string;
  week52Range: string;
  volume: string;
  averageVolume: string;
  marketCap: string;
  beta: string;
  peRatio: string;
  eps: string;
  earningsDate: string;
  dividendYield: string;
  exDividendDate: string;
  targetEst: string;
}

interface DescriptionData {
  name: string;
  description: string;
  website: string;
  employees: string;
  nextFiscalYearEnd: string;
  sector: string;
  industry: string;
  location: string;
  leadership: string;
}

export type TimeSeriesPoint =
  | { time: number; value: number } // For area charts
  | { time: number; open: number; high: number; low: number; value: number }; // For candlestick charts

export type TimeSeriesData = Record<string, TimeSeriesPoint[]>;
interface OptionsChain {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  europeanPrice: number;
  americanPrice: number;
  earlyExerciseValue: number;
  modelPriceDifference: number;
}

// Enhanced OptionsData type
interface OptionsData {
  calls: OptionsChain[];
  puts: OptionsChain[];
  expirationDates: string[];
  selectedDate: string;
  underlyingPrice: number;
  dividendYield: number;
  interestRate: number;
}

// New types for volatility surface
// Surface type that matches the backend PlotlySurface model
interface VolatilitySurface {
  type: string;
  x: number[]; // Strike prices
  y: number[]; // Days to expiry
  z: number[][]; // Implied Volatility grid
  colorscale: string;
  showscale: boolean;
  colorbar: {
    title: string;
    thickness: number;
    len: number;
  };
  contours: {
    z: {
      show: boolean;
      usecolormap: boolean;
      highlightcolor: string;
      project: { z: boolean };
    };
  };
  hovertemplate: string;
}

// Types for binomial tree visualization
interface BinomialTreeNode {
  id: string;
  level: number;
  position: number;
  stock_price: number;
  option_price_american: number;
  option_price_european: number;
  early_exercise: boolean;
}

interface BinomialTreeLink {
  source: string;
  target: string;
  probability: number;
  direction: string;
}

interface BinomialTreeParams {
  up_factor: number;
  risk_neutral_probability: number;
  risk_free_growth: number;
  time_step: number;
  steps: number;
  option_type: string;
  strike: number;
  initial_price: number;
  interest_rate: number;
  volatility: number;
  dividend_yield: number;
}

interface BinomialTree {
  nodes: BinomialTreeNode[];
  links: BinomialTreeLink[];
  parameters: BinomialTreeParams;
}

interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  published: string;
  sentiment: number;
  summary?: string;
  content?: string;
  imageUrl?: string;
  is_scrappable?: boolean;
}

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

  // assets for searchbar
  assets: Asset[];
  getAssets: (searchQuery: string) => Promise<void>;
  setAssets: (newAssets: Asset[]) => void;

  selectedAsset: SelectedAsset | null;
  setSelectedAsset: (asset: SelectedAsset) => void;
  isMarketOpen: boolean;
  getMarketStatus: () => Promise<void>;

  selectedMarket: string | null;
  setSelectedMarket: (market: string | null) => void;

  // watchlist financial data
  financialData: TimeSeriesData;
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedInterval: Interval;
  setSelectedInterval: (interval: Interval) => void;
  fetchFinancialData: (
    ticker: string,
    period: Period,
    interval: Interval
  ) => Promise<void>;

  // forecast data
  forecastData: TimeSeriesData | null;
  loading: boolean;
  fetchForecast: (
    ticker: string,
    period: Period,
    interval: Interval
  ) => Promise<void>;

  quoteData: QuoteData | null;
  getQuote: (ticker: string) => Promise<void>;

  descriptionData: DescriptionData | null;
  getDescription: (ticker: string) => Promise<void>;

  // toast notification error message
  errorMessage: string;
  setError: (errorMessage: string) => void;

  chartType: "area" | "candle";
  setChartType: (chartType: "area" | "candle") => void;

  technicalIndicators: {
    sma: boolean;
    ema: boolean;
    rsi: boolean;
    bb: boolean;
  };
  toggleIndicator: (indicator: "sma" | "ema" | "rsi" | "bb") => void;
  resetIndicators: () => void;

  // Options data
  optionsData: OptionsData | null;
  optionsLoading: boolean;
  // Volatility surface
  volatilitySurface: VolatilitySurface | null;
  volatilitySurfaceLoading: boolean;
  // Binomial tree
  binomialTree: BinomialTree | null;
  binomialTreeLoading: boolean;

  // Functions
  fetchOptionsData: (ticker: string, expirationDate?: string) => Promise<void>;
  fetchVolatilitySurface: (
    ticker: string,
    expirationDate?: string
  ) => Promise<void>;
  fetchBinomialTree: (
    ticker: string,
    strike: number,
    expirationDate: string,
    optionType?: string,
    steps?: number
  ) => Promise<void>;

  newsArticles: NewsArticle[];
  newsLoading: boolean;
  fetchNewsArticles: (ticker: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  user: {
    ID: "",
    email: "",
    avatar: "",
    name: "",
    snaptradeToken: "",
    snaptradeLinked: false,
  },
  setUser: (newUser) => set({ user: newUser }),
  resetUser: () =>
    set({
      user: {
        ID: "",
        email: "",
        avatar: "",
        name: "",
        snaptradeToken: "",
        snaptradeLinked: false,
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

      tickers.sort((stock1: WatchlistItem, stock2: WatchlistItem) => {
        if (stock1.Ticker < stock2.Ticker) return -1;
        if (stock1.Ticker > stock2.Ticker) return 1;
        return 0;
      });

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
      console.error(
        `ERROR: Unable to remove $${ticker} from watchlist:`,
        error
      );
    }
  },

  assets: [],
  setAssets: (newAssets) => set({ assets: newAssets }),
  // gets all assets matching search query
  getAssets: async (searchQuery) => {
    const query = searchQuery.length < 1 ? "A" : searchQuery;
    try {
      const response = await fetch(
        `${BACKEND_URL}/search?query=${encodeURIComponent(query)}`,
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
  setSelectedAsset: (asset) =>
    set({ selectedAsset: asset, selectedMarket: null }),

  isMarketOpen: false,
  getMarketStatus: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/is_market_open`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("ERROR: Failed to fetch market status");
      }

      const marketStatus = await response.json();
      set({ isMarketOpen: marketStatus });
    } catch (error) {
      console.error("ERROR: Failed to fetch market status:", error);
      set({ isMarketOpen: false });
    }
  },

  selectedMarket: null,
  setSelectedMarket: (market) =>
    set({ selectedMarket: market, selectedAsset: null }),

  financialData: {},
  fetchFinancialData: async (
    ticker,
    period = "1y" as Period,
    interval = "1d" as Interval
  ) => {
    const validIntervals =
      period === "ytd" ? getYtdIntervals() : periodIntervalMap[period];
    if (!validIntervals.includes(interval)) {
      interval = validIntervals[0];
      set({ selectedInterval: interval });
    }

    try {
      set({ financialData: {} });

      const response = await fetch(
        `${BACKEND_URL}/data?ticker=${ticker}&period=${period}&interval=${interval}`
      );
      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        throw new Error("ERROR: rawData is undefined, null, or empty");
      }

      const transformedData = Object.keys(rawData).reduce((acc, asset) => {
        const assetData = rawData[asset];
        if (!assetData || !assetData.Close) return acc;

        acc[asset] = Object.keys(assetData.Close)
          .filter((dateKey) => assetData.Close[dateKey] !== null)
          .map((dateKey) => ({
            time: normalizeTime(dateKey),
            open: assetData.Open[dateKey],
            high: assetData.High[dateKey],
            low: assetData.Low[dateKey],
            value: assetData.Close[dateKey],
          }))
          .sort((a, b) => a.time - b.time);

        return acc;
      }, {} as Record<string, { time: number; open: number; high: number; low: number; value: number }[]>);

      if (Object.keys(transformedData).length === 0) {
        throw new Error("ERROR: transformedData is empty");
      }

      set({ financialData: transformedData });
    } catch (error) {
      console.error("Error fetching watchlist financial data:", error);
      set({ financialData: {} });
      return;
    }
  },

  selectedPeriod: "1y",
  setSelectedPeriod: (period) => {
    const currentInterval = get().selectedInterval;
    const validIntervals =
      period === "ytd" ? getYtdIntervals() : periodIntervalMap[period];
    if (!validIntervals.includes(currentInterval)) {
      set({
        selectedPeriod: period,
        selectedInterval: validIntervals[0],
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
      const response = await fetch(
        `${BACKEND_URL}/predict_arima?ticker=${ticker}&period=${period}&interval=${interval}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const rawData = await response.json();

      if (!rawData || Object.keys(rawData).length === 0) {
        throw new Error("Error: rawData is undefined, null, or empty");
      }

      const normalizedData = Object.keys(rawData).reduce((acc, asset) => {
        acc[asset] = rawData[asset].map(
          (point: { time: string; value: number }) => ({
            time: normalizeTime(point.time),
            value: point.value,
          })
        );
        return acc;
      }, {} as Record<string, { time: number; value: number }[]>);

      // Set the forecastData in the same style it was served before
      set({ forecastData: normalizedData });
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      set({ forecastData: null });
    } finally {
      set({ loading: false });
    }
  },

  quoteData: null,
  getQuote: async (ticker) => {
    try {
      const response = await fetch(`${BACKEND_URL}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        throw new Error("ERROR: Unable to fetch quote data");
      }

      const data = await response.json();
      set({ quoteData: data });
    } catch (error) {
      console.error("ERROR: Unable to fetch quote data:", error);
      set({ quoteData: null });
    }
  },

  descriptionData: null,
  getDescription: async (ticker) => {
    try {
      const response = await fetch(`${BACKEND_URL}/about`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        throw new Error("ERROR: Unable to fetch description data");
      }

      const data = await response.json();
      set({ descriptionData: data });
    } catch (error) {
      console.error("ERROR: Unable to fetch description data:", error);
      set({ descriptionData: null });
    }
  },

  // Options data
  optionsData: null,
  optionsLoading: false,
  volatilitySurface: null as VolatilitySurface | null,
  volatilitySurfaceLoading: false,
  binomialTree: null,
  binomialTreeLoading: false,

  fetchOptionsData: async (ticker, expirationDate) => {
    try {
      set({ optionsLoading: true });
      const url = expirationDate
        ? `${BACKEND_URL}/options/${ticker}?expiration_date=${expirationDate}`
        : `${BACKEND_URL}/options/${ticker}`;

      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to fetch options data");
      }

      const data = await response.json();
      set({ optionsData: data, optionsLoading: false });
    } catch (error) {
      console.error("Error fetching options data:", error);
      set({
        optionsLoading: false,
        optionsData: null,
        errorMessage: `Failed to fetch options data for ${ticker}`,
      });
    }
  },

  fetchVolatilitySurface: async (ticker: string, expirationDate?: string) => {
    try {
      set({ volatilitySurfaceLoading: true });

      const url = expirationDate
        ? `${BACKEND_URL}/options/${ticker}/volatility-surface?expiration_date=${expirationDate}`
        : `${BACKEND_URL}/options/${ticker}/volatility-surface`;

      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to fetch volatility surface data");
      }

      const data = await response.json();
      set({ volatilitySurface: data, volatilitySurfaceLoading: false });

      // If we don't already have options data (which includes the price),
      // fetch that too so we have the current price
      if (!get().optionsData) {
        get().fetchOptionsData(ticker);
      }
    } catch (error) {
      console.error("Error fetching volatility surface:", error);
      set({
        volatilitySurfaceLoading: false,
        volatilitySurface: null,
      });
    }
  },

  fetchBinomialTree: async (
    ticker,
    strike,
    expirationDate,
    optionType = "call",
    steps = 5
  ) => {
    try {
      set({ binomialTreeLoading: true });
      const response = await fetch(
        `${BACKEND_URL}/options/${ticker}/binomial-tree?` +
          `strike=${strike}&expiration_date=${expirationDate}&option_type=${optionType}&steps=${steps}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch binomial tree data");
      }

      const data = await response.json();
      set({ binomialTree: data, binomialTreeLoading: false });
    } catch (error) {
      console.error("Error fetching binomial tree:", error);
      set({
        binomialTreeLoading: false,
        binomialTree: null,
      });
    }
  },

  errorMessage: "",
  setError: (errorMessage) => set({ errorMessage }),

  chartType: "area", // default to "area" chart
  setChartType: (chartType: "area" | "candle") => set({ chartType }),

  // Technical Indicators State for Overlays
  technicalIndicators: {
    sma: false,
    ema: false,
    rsi: false,
    bb: false,
  },
  toggleIndicator: (indicator: "sma" | "ema" | "rsi" | "bb") =>
    set((state) => ({
      technicalIndicators: {
        ...state.technicalIndicators,
        [indicator]: !state.technicalIndicators[indicator],
      },
    })),
  resetIndicators: () =>
    set({
      technicalIndicators: {
        sma: false,
        ema: false,
        rsi: false,
        bb: false,
      },
    }),
  newsArticles: [],
  newsLoading: false,
  fetchNewsArticles: async (ticker) => {
    try {
      set({ newsLoading: true });
      const response = await fetch(`${BACKEND_URL}/news/${ticker}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }

      const data = await response.json();
      set({ newsArticles: data, newsLoading: false });
    } catch (error) {
      console.error("Error fetching news:", error);
      set({
        newsLoading: false,
        newsArticles: [],
        errorMessage: `Failed to fetch news for ${ticker}`,
      });
    }
  },
}));
export type { OptionsData, OptionsChain, VolatilitySurface, BinomialTree };
