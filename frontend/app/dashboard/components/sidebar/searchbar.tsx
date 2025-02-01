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

export function SearchBar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { state } = useSidebar();

  // search keybind (cmd + k, ctrl + k)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
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
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {/* hard coded data TODO: dynamic */}
          <CommandGroup heading="Securities">
            <CommandItem>Apple (AAPL)</CommandItem>
            <CommandItem>Microsoft (MSFT)</CommandItem>
            <CommandItem>Google (GOOGL)</CommandItem>
            <CommandItem>Amazon (AMZN)</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
