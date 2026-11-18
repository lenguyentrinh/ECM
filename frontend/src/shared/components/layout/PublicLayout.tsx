import type { PropsWithChildren } from "react";
import Header from "./Header.tsx";
import Footer from "./Footer.tsx";

export default function PublicLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}