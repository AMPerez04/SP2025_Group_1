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

interface Asset {
  ticker: string;
  icon: string;
  full_name: string;
  market: string;
  country: string;
  country_flag: string;
}

export function SearchBar() {
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const { state } = useSidebar();

  // autocomplete search results
  useEffect(() => {
    if (searchQuery.length < 1) return;

    const fetchAssets = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/search?query=${searchQuery}`
        );
        const data = await response.json();
        setAssets(data);
      } catch (error) {
        console.error("Error fetching assets:", error);
      }
    };

    // Debounce the API request
    const debounceTimer = setTimeout(() => {
      fetchAssets();
    }, 100); // Adjust the delay as needed

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
        <CommandList className="min-h-[300px]">
          {assets.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <CommandGroup heading="Securities">
              {assets.slice(0, 100).map((asset: Asset) => (
                <CommandItem key={asset.ticker} className="p-2">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    {/* asset's icon & ticker */}
                    <div className="flex items-center justify-start">
                      <Image
                        src={asset.icon}
                        alt={asset.ticker}
                        width={28}
                        height={28}
                        className="rounded-full bg-black object-contain p-[3.5px]"
                      />
                      <span className="ml-3 font-medium">{asset.ticker}</span>
                    </div>

                    {/* asset's official name */}
                    <div className="col-span-4 ml-5">
                      <div className="font-medium">
                        {asset.full_name.length > 30
                          ? `${asset.full_name.slice(0, 30)}...`
                          : asset.full_name}
                      </div>
                    </div>

                    {/* asset's market & flag */}
                    <div className="flex items-center justify-end col-span-1 space-x-2">
                      <span className="mr-3 text-xs text-muted-foreground">
                        {asset.market}
                      </span>
                      <Image
                        src={asset.country_flag}
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
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
