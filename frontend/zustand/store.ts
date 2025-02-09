import { create } from "zustand";

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

interface Store {
  // user info
  user: User;
  setUser: (newUser: User) => void;

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
}

export const useStore = create<Store>((set, get) => ({
  user: {
    ID: "67a2e2ca7d35e6dfd35f3b12",
    email: "jd@wustl.edu",
    avatar: "",
    name: "John Doe",
  },
  setUser: (newUser) => set({ user: newUser }),

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
      const response = await fetch(`http://127.0.0.1:8000/watchlist/${ID}`);
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
      const response = await fetch("http://127.0.0.1:8000/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  // removes asset from user's watchlist
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
    }
  },

  assets: [],
  setAssets: (newAssets) => set({ assets: newAssets }),
  // gets all assets matching search query
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
      set({ assets: [] }); // if error --> display no search results
    }
  },

  selectedAsset: null,
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
}));
