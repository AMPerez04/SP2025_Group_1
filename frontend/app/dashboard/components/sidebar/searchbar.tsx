import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  CommandItem,
  CommandList,
  CommandInput,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

// hardcoded assets
const assets = [
  {
    icon: "https://s3-symbol-logo.tradingview.com/nvidia.svg",
    ticker: "NVDA",
    fullName: "NVIDIA Corporation",
    market: "NASDAQ",
    country: "US",
    countryFlag: "https://s3-symbol-logo.tradingview.com/country/US.svg",
  },
  {
    icon: "https://s3-symbol-logo.tradingview.com/apple.svg",
    ticker: "AAPL",
    fullName: "Apple Inc.",
    market: "NASDAQ",
    country: "US",
    countryFlag: "https://s3-symbol-logo.tradingview.com/country/US.svg",
  },
];

export function SearchBar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { state } = useSidebar();

  // search keybind (cmd + k, ctrl + k)
  useEffect(() => {
    const keypress = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", keypress);
    return () => document.removeEventListener("keydown", keypress);
  }, []);

  // filter search assets by ticker, fullname, or market
  const filteredAssets = assets.filter(
    (asset) =>
      asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.market.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={cn(
        "transition-opacity duration-200",
        state === "collapsed" ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* fake search box */}
      <div className="relative mt-4 w-4/6 lg:w-11/12 justify-self-center">
        <Input
          placeholder={"Search"}
          icon={<Search className="w-5 h-5 text-muted-foreground" />}
          onClick={() => setCommandOpen(true)}
          readOnly
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* search modal */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="Search for an asset..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Securities">
            {filteredAssets.map((asset) => (
              <CommandItem key={asset.ticker} className="p-2">
                <div className="grid grid-cols-6 gap-4 items-center">
                  {/* asset's icon & ticker */}
                  <div className="flex items-center justify-center">
                    <Image
                      src={asset.icon}
                      alt={asset.ticker}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                    <span className="ml-3 font-medium">{asset.ticker}</span>
                  </div>

                  {/* asset's official name */}
                  <div className="col-span-4">
                    <div className="font-medium">
                      {asset.fullName.length > 38
                        ? `${asset.fullName.slice(0, 38)}...`
                        : asset.fullName}
                    </div>
                  </div>

                  {/* asset's market & flag */}
                  <div className="flex items-center justify-end col-span-1 space-x-2">
                    <span className="mr-3 text-xs text-muted-foreground">
                      {asset.market}
                    </span>
                    <Image
                      src={asset.countryFlag}
                      alt={asset.country}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
