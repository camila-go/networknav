import { Suspense } from "react";
import { NetworkContainer } from "@/components/network/network-container";

export const metadata = {
  title: "Network Map | Jynx",
  description: "Visualize your conference network and discover connection patterns",
};

export default function NetworkPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <NetworkContainer />
      </Suspense>
    </div>
  );
}



