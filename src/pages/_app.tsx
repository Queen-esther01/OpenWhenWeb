import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "1rem",
            background: "#fff8f4",
            color: "#5f2f43",
            border: "1px solid rgba(238,195,210,0.6)",
            fontFamily: "var(--font-calm-sans), Avenir Next, sans-serif",
            fontSize: "0.875rem",
          },
        }}
      />
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}