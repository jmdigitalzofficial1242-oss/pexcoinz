import { ReactNode } from "react";
import { Header } from "./header";
import { ServerStatus } from "./server-status";
import { FloatingSupport } from "./floating-support";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <ServerStatus />
      <Header />
      <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      <footer className="border-t py-4 md:py-0 hidden md:block">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-12 md:flex-row max-w-screen-2xl">
          <p className="text-balance text-center text-xs leading-loose text-muted-foreground md:text-left">
            &copy; 2025 PexCoin. All rights reserved.
          </p>
        </div>
      </footer>
      <FloatingSupport />
    </div>
  );
}
