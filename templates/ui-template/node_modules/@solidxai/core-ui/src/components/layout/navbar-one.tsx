import { ToastContainer } from "../../helpers/ToastContainer";
import { useGetSolidMenuBasedOnRoleQuery } from "../../redux/api/solidMenuApi";
import { setIsAuthenticated, setUser } from "../../redux/features/userSlice";
import { env } from "../../adapters/env";
import { useSession } from "../../hooks/useSession";
import { Button } from "primereact/button";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import NavbarTwoMenu from "./navbar-two-menu";
import UserProfileMenu from "./user-profile-menu";

const NavbarOne = () => {
    const dispatch = useDispatch();
    const [visibleNavbar, setVisibleNavbar] = useState(false);

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
    const handleToggle = () => setVisibleNavbar(!visibleNavbar);
    const handleMenu = (m: any) => {
        // setShow(true);
        setVisibleNavbar(!visibleNavbar);
        setCurrentMainMenu(m.title);
        setCurrentMenu(m.children);
    };

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



    return (
        <div className="flex flex-column md:flex-row justify-content-between navBar">
            <ToastContainer />

            {/* commented this as this is not working properly @Jenendar to figure this out... */}
            {currentMainMenu && (
                <div>
                    <a
                        className={
                            visibleNavbar
                                ? "navtwo-toggle active-menu-image"
                                : "navtwo-toggle"
                        }
                        onClick={handleToggle}
                    >
                        <img
                            style={{ cursor: "pointer" }}
                            src={`/images/menu-toggle.png`}
                            alt="Solid"
                        />
                    </a>
                </div>
            )}
            <div className="navBarOne">
                <div>
                    {/* <div className="p-0">
                        <div className="navbar-brand">
                            <a href="/">
                                <img
                                    style={{ cursor: "pointer" }}
                                    src="/images/logo.png"
                                    alt="Solid"
                                />
                            </a>
                        </div>
                    </div> */}
                    <div className="navbar-menu">
                        <>
                            {menu && menu.data.length > 0 && menu.data.map((m: any) => (
                                <div
                                    key={m.title}
                                    className={`menu-item ${currentMainMenu === m.title ? "active-menu-image" : ""}`}
                                >
                                    <a onClick={() => handleMenu(m)}>
                                        <img
                                            style={{ cursor: "pointer", width: '30px' }}
                                            // src={currentMainMenu === m.title ? `/images/${m.title.toLocaleLowerCase()}-active.svg` : `/images/${m.title.toLocaleLowerCase()}.svg`}
                                            // src={`/images/menu/${m.title}.svg`}
                                            src={m.icon.startsWith("/") ? m.icon : `${env("API_URL")}/${m.icon}`}
                                            // src={`/images/menu/app-builder.svg`}
                                            alt="Solid"
                                        />
                                    </a>
                                </div>
                            ))}
                        </>
                    </div>
                </div>
                <UserProfileMenu></UserProfileMenu>
            </div>
            {currentMenu && (
                <div className={visibleNavbar ? "show navBarTwo" : "hide navBarTwo"}>
                    <div className="flex relative justify-content-between align-items-center pt-4 px-3 pb-3 mb-3">
                        <div className="absolute bottom-0" style={{ width: 50, height: 0.8, background: '#d8e2ea' }}></div>
                        {!isSearchShow && <div className="text-base font-semibold">{currentMainMenu && currentMainMenu}</div>}
                        {isSearchShow === false && <Button outlined icon="pi pi-search" severity="secondary" aria-label="Search" size="small" style={{ maxWidth: 32, maxHeight: 32, border: '1px solid #d1d5db' }}
                            onClick={() => setSearchShow(true)}
                        />
                        }
                        {isSearchShow &&
                            <div className="w-full" style={{ position: 'relative' }} ref={searchRef}>
                                <IconField iconPosition="left">
                                    <InputIcon className="pi pi-search text-sm"> </InputIcon>
                                    <InputText placeholder="Search" className="small-input text-sm w-full pr-6" />
                                </IconField>
                                <div className="absolute max-h-1rem" style={{ top: 5, right: 5 }}>
                                    <img
                                        // className="absolute right-0 top-0 max-h-1rem"
                                        style={{ cursor: "pointer", maxHeight: '1.3rem' }}
                                        src="/images/icons/jump-to-icon.png"
                                        alt="Solid"
                                    />
                                </div>
                            </div>
                        }
                        {/* <div className="input-icon inputDiv navtwo-searchbox">
                            <i className="pi pi-search " style={{ color: '#8D9199' }}></i>
                            <input
                                type="text"
                                placeholder="Jump to."
                                name="lastName"
                                id="lastName"
                                onChange={(e) => setSearchTerm(e.target.value)}
                                value={searchTerm}
                                className=""
                            />
                            <img
                                style={{ cursor: "pointer" }}
                                src="/images/icons/jump-to-icon.png"
                                alt="Solid"
                            />
                        </div> */}
                    </div>
                    {/* <div className="flex flex-column md:flex-row  navtwo-header justify-content-between">
            <div className="text-sm font-semibold">{currentMainMenu && currentMainMenu}</div> */}
                    {/* <a
              className={
                visibleNavbar
                  ? "navtwo-toggle active-menu-image"
                  : "navtwo-toggle"
              }
              onClick={handleToggle}
            >
              <img
                style={{ cursor: "pointer" }}
                src={`/images/menu-toggle.png`}
                alt="Solid"
              />
            </a> */}
                    {/* </div>
          <div className="p-inputgroup"> */}
                    {/* <div className="p-inputgroup navtwo-searchbox">
              
              <span className="p-inputgroup-addon">
                <i className="pi pi-search "></i>
              </span>
              <InputText
                placeholder="Search"
                onChange={e => setSearchTerm(e.target.value)} 
                />
              <span className="p-inputgroup-addon">⌘+k</span>
            </div> */}
                    {/* <div className="input-icon inputDiv navtwo-searchbox">
              <i className="pi pi-search " style={{ color: '#8D9199' }}></i>
              <input
                type="text"
                placeholder="Jump to."
                name="lastName"
                id="lastName"
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                className=""
              />
              <img
                style={{ cursor: "pointer" }}
                src="/images/icons/jump-to-icon.png"
                alt="Solid"
              />
            </div> */}

                    {/* <Button icon="pi pi-search" className="p-button-outlined" onClick={handleSearch} /> */}
                    {/* </div> */}

                    <div
                        className={
                            visibleNavbar ? "navTwoMenuLayout px-2 show" : "navTwoMenuLayout hide"
                        }
                    >
                        <NavbarTwoMenu menuItems={currentMenu}></NavbarTwoMenu>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NavbarOne;
