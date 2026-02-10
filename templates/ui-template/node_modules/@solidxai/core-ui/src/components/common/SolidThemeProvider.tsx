

import { useEffect, useState } from "react";
import { usePathname } from "../../hooks/usePathname";
import { useSelector } from "react-redux";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";

export const SolidThemeProvider = () => {
    const pathname = usePathname();
    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery()
    useEffect(() => {
        if (pathname.includes("/auth/")) {
            trigger("");
        }
    }, [pathname, trigger]);

    const [theme, setTheme] = useState("solid-light-purple");
    useEffect(() => {
        if (pathname.includes("/auth/") && solidSettingsData?.data?.authPagesTheme) {
            const selectedTheme =
                solidSettingsData?.data?.authPagesTheme === "dark" ? "solid-dark-purple" : "solid-light-purple";
            setTheme(selectedTheme);
        } else {
            setTheme("solid-light-purple");
        }
    }, [pathname, solidSettingsData]);

    useEffect(() => {
        // Find or create <link> element
        let themeLink = document.getElementById("theme-css") as HTMLLinkElement;

        // if (!themeLink) {
        //     themeLink = document.createElement("link");
        //     themeLink.id = "theme-css";
        //     themeLink.rel = "stylesheet";
        //     document.head.appendChild(themeLink);
        // }

        // Update theme link dynamically
        themeLink.href = `/themes/${theme}/theme.css`;
    }, [theme]);

    return null;
}
