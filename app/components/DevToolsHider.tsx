"use client";

import { useEffect } from "react";

export default function DevToolsHider() {
    useEffect(() => {
        // Function to hide the element
        const hideDevTools = () => {
            // Inject generic style targeting the custom element
            const style = document.createElement("style");
            style.textContent = `
        nextjs-portal {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
      `;
            document.head.appendChild(style);

            // Also try to find and remove/hide specific element via JS
            const interval = setInterval(() => {
                const portal = document.querySelector("nextjs-portal") as HTMLElement | null;
                if (portal) {
                    portal.style.display = "none";
                    portal.remove(); // aggressive
                }

                // Also look for shadow root specifically if needed, but removing host is enough
            }, 500);

            return () => clearInterval(interval);
        };

        hideDevTools();
    }, []);

    return null;
}
