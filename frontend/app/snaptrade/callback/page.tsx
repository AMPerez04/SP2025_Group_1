// app/snaptrade/callback/page.tsx
import { Suspense } from "react";
import SnapTradeCallbackClient from "./client";

export default function SnapTradeCallbackPage() {
  return (
    <Suspense fallback={<p className="p-4 text-center">Loading SnapTrade callback...</p>}>
      <SnapTradeCallbackClient />
    </Suspense>
  );
}
