/* eslint-disable react-hooks/exhaustive-deps */
import { ChildContainerProps, LayoutState } from '../../types';
import { usePathname } from "../../hooks/usePathname";
import { useSearchParams } from "../../hooks/useSearchParams";
import { PrimeReactContext } from 'primereact/api';
import { useEventListener, useUnmountEffect } from 'primereact/hooks';
import { classNames } from 'primereact/utils';
import React, { useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import AppConfig from './AppConfig';
import { LayoutContext } from './context/layoutcontext';
import AppSidebar from './AppSidebar';
import SolidPopupContainer from '../common/SolidPopupContainer';
import { useSession } from "../../hooks/useSession";
import { getExtensionFunction } from '../../helpers/registry';
import { SolidOnApplicationMountEvent } from '../../types/solid-core';
import { env } from "../../adapters/env";

export const Layout = ({ children }: ChildContainerProps) => {
    const { layoutConfig, layoutState, setLayoutState } = useContext(LayoutContext);
    const { setRipple } = useContext(PrimeReactContext);
    // const topbarRef = useRef<AppTopbarRef>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [bindMenuOutsideClickListener, unbindMenuOutsideClickListener] = useEventListener({
        type: 'click',
        listener: (event) => {
            const isOutsideClicked = !(
                sidebarRef.current?.isSameNode(event.target as Node) ||
                sidebarRef.current?.contains(event.target as Node)
                // topbarRef.current?.menubutton?.isSameNode(event.target as Node) ||
                // topbarRef.current?.menubutton?.contains(event.target as Node)
            );

            if (isOutsideClicked) {
                hideMenu();
            }
        }
    });

    const pathname = usePathname();
    const searchParams = useSearchParams();
    useEffect(() => {
        hideMenu();
        hideProfileMenu();
    }, [pathname, searchParams]);

    // const [bindProfileMenuOutsideClickListener, unbindProfileMenuOutsideClickListener] = useEventListener({
    //     type: 'click',
    //     listener: (event) => {
    //         const isOutsideClicked = !(
    //             topbarRef.current?.topbarmenu?.isSameNode(event.target as Node) ||
    //             topbarRef.current?.topbarmenu?.contains(event.target as Node) ||
    //             topbarRef.current?.topbarmenubutton?.isSameNode(event.target as Node) ||
    //             topbarRef.current?.topbarmenubutton?.contains(event.target as Node)
    //         );

    //         if (isOutsideClicked) {
    //             hideProfileMenu();
    //         }
    //     }
    // });

    const hideMenu = () => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            overlayMenuActive: false,
            staticMenuMobileActive: false,
            menuHoverActive: false
        }));
        unbindMenuOutsideClickListener();
        unblockBodyScroll();
    };

    const hideProfileMenu = () => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            profileSidebarVisible: false
        }));
        // unbindProfileMenuOutsideClickListener();
    };

    const blockBodyScroll = (): void => {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        } else {
            document.body.className += ' blocked-scroll';
        }
    };

    const unblockBodyScroll = (): void => {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        } else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    };

    useEffect(() => {
        if (layoutState.overlayMenuActive || layoutState.staticMenuMobileActive) {
            bindMenuOutsideClickListener();
        }

        layoutState.staticMenuMobileActive && blockBodyScroll();
    }, [layoutState.overlayMenuActive, layoutState.staticMenuMobileActive]);

    // useEffect(() => {
    //     if (layoutState.profileSidebarVisible) {
    //         bindProfileMenuOutsideClickListener();
    //     }
    // }, [layoutState.profileSidebarVisible]);

    useUnmountEffect(() => {
        unbindMenuOutsideClickListener();
        // unbindProfileMenuOutsideClickListener();
    });

    const containerClass = classNames('layout-wrapper', {
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive,
        'p-input-filled': layoutConfig.inputStyle === 'filled',
    });
    const { visibleNavbar } = useSelector((state: any) => state.navbarState); // Get the visibility state of sidebar-two


    const session = useSession();
    const user = session?.data?.user;

    const hasRunRef = useRef(false);

    useEffect(() => {
        if (hasRunRef.current) return;
        if (!session || !user) return;

        const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const isReload = navEntry?.type === "reload";

        // Detect first mount (after login redirect)
        const isFirstMount = !sessionStorage.getItem("app-mounted");

        // Allow execution only for:
        //  1. First mount
        //  2. Reload
        if (isFirstMount || isReload) {
            sessionStorage.setItem("app-mounted", "true");
        } else {
            return;
        }

        hasRunRef.current = true;

        const handleDynamicFunction = async () => {
            const dynamicHeader = env("SOLIDX_ON_APPLICATION_MOUNT_HANDLER");

            const event: SolidOnApplicationMountEvent = {
                type: "onApplicationMount",
                user,
                session: session.data
            };

            if (dynamicHeader) {
                const DynamicFunctionComponent = getExtensionFunction(dynamicHeader);
                if (DynamicFunctionComponent) {
                    await DynamicFunctionComponent(event);
                }
            }
        };

        handleDynamicFunction();
    }, [session, session?.data, user]);

    // const dispatch = useDispatch()
    // const { data: solidSettingsDataInitialData } = useGetSolidSettingsQuery("")
    // useEffect(() => {
    //     if (solidSettingsDataInitialData) {
    //         dispatch(setSolidSettings(solidSettingsDataInitialData?.data));
    //     }
    // }, [solidSettingsDataInitialData]);

    // const toggleBothSidebars = () => {
    //     if (visibleNavbar) {
    //         dispatch(toggleNavbar());   // close both
    //     } else {
    //         dispatch(showNavbar());     // open both
    //     }
    // };

    return (
        <React.Fragment>
            <div className={containerClass}>
                {/* {getEnv("NEXT_PUBLIC_ENABLE_CUSTOM_HEADER_FOOTER") == "true" && <CustomHeader />} */}
                <AppSidebar />
                {/* <div className="apps-icon block md:hidden" onClick={toggleBothSidebars}>
                    <i className="pi pi-th-large"></i>
                </div> */}
                <SolidPopupContainer></SolidPopupContainer>
                <div className={`main-content ${visibleNavbar ? "shifted" : ""}`}>
                    {children}
                    {/* {getEnv("NEXT_PUBLIC_ENABLE_CUSTOM_HEADER_FOOTER") == "true" && <CustomFooter />} */}
                </div>
                <AppConfig />
                <div className="layout-mask"></div>
            </div>
        </React.Fragment>
    );
};
