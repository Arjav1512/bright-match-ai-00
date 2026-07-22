import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Force apex domain — www.wroob.in has no DNS record, so any OAuth callback
// that lands there (e.g. from a bookmarked/shared www URL) breaks with
// DNS_PROBE_FINISHED_NXDOMAIN. Redirect to the canonical apex before boot.
if (typeof window !== "undefined" && window.location.hostname === "www.wroob.in") {
  window.location.replace(
    `https://wroob.in${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}


createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
