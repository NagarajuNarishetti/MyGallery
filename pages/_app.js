import "../styles/globals.css";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }) {
    useEffect(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
        const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = stored || (prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
    }, []);

    return <Component {...pageProps} />;
}


