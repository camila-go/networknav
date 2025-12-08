import { Suspense } from "react";
import { MessagesContainer } from "@/components/messages/messages-container";

export const metadata = {
  title: "Messages | NetworkNav",
  description: "Chat with your leadership connections",
};

export default function MessagesPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <MessagesContainer />
      </Suspense>
    </div>
  );
}

