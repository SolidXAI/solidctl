import { ToastContainer } from "../../helpers/ToastContainer";
import { useGetSolidMenuBasedOnRoleQuery } from "../../redux/api/solidMenuApi";
import { showNavbar, toggleNavbar, hideNavbar } from "../../redux/features/navbarSlice";
import { setIsAuthenticated, setUser } from "../../redux/features/userSlice";
import { useSession } from "../../hooks/useSession";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import NavbarTwoMenu from "./navbar-two-menu";
import UserProfileMenu from "./user-profile-menu";
import Image from "../common/Image";
import SettingImage from '../../resources/images/Navigation/SolidSettinsIcon.svg'
import { Avatar } from "primereact/avatar";
import { usePathname } from "../../hooks/usePathname";
import { env } from "../../adapters/env";

const AppSidebar = () => {
    const dispatch = useDispatch();
    const pathname = usePathname();
    // const [show, setShow] = useState(false);
    const visibleNavbar = useSelector(
        (state: any) => state.navbarState.visibleNavbar
    );
    const { data: menu } = useGetSolidMenuBasedOnRoleQuery("");


    const [currentMenu, setCurrentMenu] = useState();
    const [currentMainMenu, setCurrentMainMenu] = useState();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (menu) {
            setCurrentMenu(menu && menu.data.length > 0 && menu.data.filter((m: any) => m.key === env("NEXT_PUBLIC_DEFAULT_MENU_KEY"))[0]?.children);
            setCurrentMainMenu(menu && menu.data.length > 0 && menu.data.filter((m: any) => m.key === env("NEXT_PUBLIC_DEFAULT_MENU_KEY"))[0]?.title)
        }
    }, [menu])

    const { data } = useSession();

    // const handleToggle = () => setShow(!show);
    const handleToggle = () => dispatch(toggleNavbar());
    const handleMenu = (m: any) => {
        // setShow(true);
        dispatch(showNavbar());
        setCurrentMainMenu(m.title);
        setCurrentMenu(m.children);
    };

    useEffect(() => {
        // Check if screen is small at the time of route change
        if (window.innerWidth <= 1199) {
            dispatch(hideNavbar());
        }
    }, [pathname, dispatch]);


    useEffect(() => {
        if (data) {
            dispatch(setUser(data?.user));
            dispatch(setIsAuthenticated(true));
        }
    }, [data]);

    const [isSearchShow, setSearchShow] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: any) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setSearchShow(false);
        }
    };

    useEffect(() => {
        if (isSearchShow) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSearchShow]);

    const additionalMenu = {
        title: "General Settings",
        key: "general-settings",
        children: [
            {
                title: "Settings",
                path: "",
                key: "settings-menu-item",
                children: [
                    {
                        title: "App Settings",
                        path: "/admin/settings/app-settings",
                        key: "app-setting"
                    },
                    {
                        title: "Authentication Settings",
                        path: "/admin/settings/authentication-settings",
                        key: "auth-setting"
                    },
                    {
                        title: "Misc",
                        path: "/admin/settings/misc-settings",
                        key: "misc-setting"
                    }
                ]
            }
        ],
        icon: env("NEXT_PUBLIC_SETTINGS_ICON") ? env("NEXT_PUBLIC_SETTINGS_ICON") : SettingImage
    };



    return (
        <>
            <ToastContainer />
            {visibleNavbar && (
                <div
                    className="sidebar-backdrop"
                    onClick={handleToggle}
                />
            )}
            {/* commented this as this is not working properly @Jenendar to figure this out... */}
            {(visibleNavbar || currentMainMenu) && (
                <div
                    className={`sidebar-toggle-button  ${!visibleNavbar || !currentMainMenu ? "s-collapsed hidden md:flex" : ""}`}
                    onClick={handleToggle}
                // severity="secondary"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="0.3" y="0.3" width="23.4" height="23.4" rx="2.1" fill="white" />
                        <rect x="0.3" y="0.3" width="23.4" height="23.4" rx="2.1" stroke="#D8E2EA" strokeWidth="0.6" />
                        <path d="M5.09735 16V14.6667H13.5929V16H5.09735ZM5.09735 12.6667V11.3333H11.6324V12.6667H5.09735ZM5.09735 9.33333V8H13.5929V9.33333H5.09735Z" fill="#8D9199" />
                        <path d="M16.2621 12L18.9026 14.3L18.099 15L14.6549 12L18.099 9L18.9026 9.7L16.2621 12Z" fill="#8D9199" />
                    </svg>
                </div>
            )}

            <div className={`sidebar-left ${visibleNavbar ? "open" : ""}`}>
                <div className="navbar-menu">
                    {menu?.data.length > 0 && menu?.data.map((m: any) => {
                        const iconSrc =
                            typeof m.icon === "string"
                                ? m.icon
                                : m.icon && typeof m.icon.src === "string"
                                    ? m.icon.src
                                    : null;
                        return (
                            <a
                                key={m.title}
                                className={`flex align-items-center menu-item ${currentMainMenu === m.title ? "active-menu-image" : ""}`}
                                onClick={() => handleMenu(m)}
                                style={{ cursor: 'pointer' }}
                            >
                                {m.icon ?
                                    <Image
                                        src={iconSrc.startsWith("/") ? iconSrc : `${env("API_URL")}/${iconSrc}`}
                                        alt={m.title}
                                        height={30}
                                        width={30}
                                        className="relative"
                                        unoptimized
                                    />
                                    :
                                    <div>
                                        <Avatar label={m.title.charAt(0)} shape="circle" style={{ backgroundColor: 'var(--primary-color)', fontWeight: 500 }} />
                                    </div>
                                }
                            </a>
                        )
                    })}
                </div>

                <UserProfileMenu></UserProfileMenu>
            </div>
            {currentMenu && (
                <div className={`sidebar-right ${visibleNavbar ? "open" : ""}`}>

                    <div className="flex relative justify-content-between align-items-center py-3 xl:py-4 px-3">
                        <div className="text-base sidebar-title font-semibold">{currentMainMenu && currentMainMenu}</div>
                        {/* <button
                            className="sidebar-toggle-button"
                            onClick={handleToggle}
                        >
                            <img
                                style={{ cursor: "pointer" }}
                                src={`/images/menu-toggle.png`}
                                alt="Solid"
                            />
                        </button> */}
                    </div>
                    {/* <div className="w-full px-3 mb-3" style={{ position: 'relative' }} ref={searchRef}>
                        <IconField iconPosition="left">
                            <InputIcon className="pi pi-search text-sm"> </InputIcon>
                            <InputText placeholder="Search" className="small-input text-sm w-full pr-6" />
                        </IconField>
                        <div className="absolute max-h-1rem" style={{ top: 5, right: 20 }}>
                            <img
                                style={{ cursor: "pointer", maxHeight: '1.3rem' }}
                                src="/images/icons/jump-to-icon.png"
                                alt="Solid"
                            />
                        </div>
                    </div> */}
                    <div className="px-3 solid-sidebar-menuitems-wrapper">
                        <NavbarTwoMenu menuItems={currentMenu}></NavbarTwoMenu>
                    </div>
                </div>
            )}
        </>
    );
};

export default AppSidebar;
