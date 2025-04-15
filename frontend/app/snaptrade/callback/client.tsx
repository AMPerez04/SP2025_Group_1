"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useStore, BACKEND_URL } from "@/zustand/store";

interface OptionSymbol {
    ticker: string;
    strike_price: number;
    expiration_date: string;
    option_type: string;
}

interface OptionPosition {
    symbol: {
        option_symbol: OptionSymbol;
    };
    units: number;
    price: number;
}

interface Account {
    name: string;
}

interface HoldingEntry {
    account: Account;
    total_value: {
        value: number;
    };
    option_positions: OptionPosition[];
}


export default function SnapTradeCallbackClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const setUser = useStore((state) => state.setUser);
    const currentUser = useStore((state) => state.user);

    const [holdings, setHoldings] = useState<HoldingEntry[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.ID) {
            toast.error("User ID missing. Please refresh or log in again.");
            return;
        }
    
        // Only update if not already linked
        if (!currentUser.snaptradeLinked) {
            toast.success("Your investment account was linked successfully!");
            setUser({
                ...currentUser,
                snaptradeLinked: true,
            });
        }
    
        const fetchHoldings = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/snaptrade/holdings?user_id=${currentUser.ID}`);
                const data = await res.json();
                setHoldings(data);
            } catch (err) {
                toast.error("Failed to fetch holdings");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
    
        fetchHoldings();
    }, [searchParams, currentUser, setUser]); 
    


    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center">SnapTrade Portfolio</h2>
            {loading ? (
                <p className="text-center">Loading holdings...</p>
            ) : holdings.length === 0 ? (
                <p className="text-center">No holdings found for this account.</p>
            ) : (
                <div className="space-y-4">
                    {holdings.map((account, i) => (
                        <div key={i} className="p-4 border rounded-md shadow">
                            <h3 className="font-semibold text-lg">
                                {account.account?.name ?? "Brokerage Account"}
                            </h3>
                            <p className="text-sm mb-2 text-muted">
                                Balance: ${account.total_value?.value?.toFixed(2) ?? 0}
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                {account.option_positions.map((pos, idx) => (
                                    <li key={idx}>
                                        {pos.symbol.option_symbol.ticker} - {pos.units} units @ $
                                        {pos.price.toFixed(2)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 text-center">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
