import Link from "../common/Link";
import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { PrimeReactContext } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Image from "../common/Image";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { Divider } from "primereact/divider";
import AuthScreenRightBackgroundImage from '../../resources/images/auth/solid-left-layout-bg.png';
import AuthScreenLeftBackgroundImage from '../../resources/images/auth/solid-right-layout-bg.png';
import AuthScreenCenterBackgroundImage from '../../resources/images/auth/solid-login-light.png';
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";
import { env } from "../../adapters/env";


export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery()

    const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // const { changeTheme } = useContext(PrimeReactContext);
    // const { layoutConfig, setLayoutConfig } = useContext(LayoutContext);
    // const dispatch = useDispatch();
    // const _changeTheme = (theme: string, colorScheme: string) => {
    //     changeTheme?.(layoutConfig.theme, theme, 'theme-css', () => {
    //         setLayoutConfig((prevState: LayoutConfig) => ({ ...prevState, theme, colorScheme }));
    //     });
    // };
    // useEffect(() => {
    //     const theme = solidSettingsData?.data?.authPagesTheme; // 'dark' or 'light'
    //     if (theme) {
    //         dispatch(toggleTheme()); // Dispatch Redux action
    //         _changeTheme(
    //             theme === "dark" ? "solid-dark-purple" : "solid-light-purple",
    //             theme
    //         );
    //     }
    // }, [solidSettingsData]);
    useEffect(() => {
        // Fetch settings if not already available
        trigger("");

        const allowPublicRegistration = solidSettingsData?.data?.allowPublicRegistration;
        if (allowPublicRegistration === false) {
            setAllowRegistration(false);
            if (pathname === "/auth/register") {
                setIsRestricted(true);
            } else {
                setIsRestricted(false);
            }
        } else if (allowPublicRegistration === true) {
            setAllowRegistration(true);
            setIsRestricted(false);
        }
    }, [solidSettingsData, pathname, trigger]);

    if (allowRegistration === null && pathname === "/auth/register") {
        console.log(`AuthLayout returning null because allowRegistration is null for register route`);
        return null;
    }

    const authChildren = allowRegistration || pathname !== "/auth/register" ? children : null;
    const handleRegistration = () => {
        router.push("/auth/login");
        setIsRestricted(false);
    }

    const solidSideBanner = () => {
        const layout = solidSettingsData?.data?.authPagesLayout;

        let src = '';

        if (layout === 'left') {
            src = solidSettingsData?.data?.authScreenLeftBackgroundImage || (AuthScreenLeftBackgroundImage as any).src || AuthScreenLeftBackgroundImage;
        } else if (layout === 'right') {
            src = solidSettingsData?.data?.authScreenRightBackgroundImage || (AuthScreenRightBackgroundImage as any).src || AuthScreenRightBackgroundImage;
        } else if (layout === 'center') {
            src = solidSettingsData?.data?.authScreenCenterBackgroundImage || (AuthScreenCenterBackgroundImage as any).src || AuthScreenCenterBackgroundImage;
        }

        // Normalize image path if coming from API
        const isBlobOrAbsolute = src?.startsWith("blob:") || src?.startsWith("http");
        if (!isBlobOrAbsolute && !src?.startsWith("/")) {
            src = `${env("API_URL")}/${src}`;
        }

        return src;
    };

    return (
        <div className={`solid-auth-theme-wrapper ${solidSettingsData?.data?.authPagesLayout || 'center'}`}
            style={
                solidSettingsData?.data?.authPagesLayout === 'center' ? { backgroundImage: `url(${solidSettingsData?.data?.authScreenCenterBackgroundImage || (AuthScreenCenterBackgroundImage as any)?.src || AuthScreenCenterBackgroundImage})` } : {}
            }
        >
            <div className={`${solidSettingsData?.data?.authPagesLayout !== 'center' ? 'grid w-full h-full m-0' : ''}`}>
                {solidSettingsData?.data?.authPagesLayout === 'left' &&
                    <div className='col-12 lg:col-7 xl:col-6  flex align-items-center justify-content-center solid-login-dark-bg'>
                        <div className="w-full">
                            {solidSettingsData?.data?.appLogoPosition === "in_form_view" &&
                                <div className="flex justify-content-center">
                                    <div className={`solid-logo flex align-items-center ${solidSettingsData?.data?.appLogoPosition}`}>
                                        <Image
                                            alt="solid logo"
                                            src={solidSettingsData?.data?.appLogo || SolidLogo}
                                            className="relative"
                                            fill
                                        />
                                    </div>
                                </div>
                            }
                            {authChildren}
                        </div>
                    </div>
                }

                <div
                    className={`hidden lg:flex ${solidSettingsData?.data?.authPagesLayout !== 'center' ? 'col-5 xl:col-6 position-relative' : ''} 
                                ${solidSettingsData?.data?.authPagesLayout === 'left' ? 'solid-left-layout' : ''} 
                                ${solidSettingsData?.data?.authPagesLayout === 'right' ? 'solid-right-layout' : ''}`.trim()}
                    style={{ backgroundImage: `url(${solidSideBanner()})` }}
                >
                    {solidSettingsData?.data?.appLogoPosition === "in_image_view" && solidSettingsData?.data?.authPagesLayout !== 'center' &&
                        <div className={`solid-logo flex align-items-center gap-3 ${solidSettingsData?.data?.appLogoPosition}`}>
                            <Image
                                alt="solid logo"
                                src={solidSettingsData?.data?.appLogo || SolidLogo}
                                className="relative"
                                fill
                            />
                        </div>
                    }
                    {solidSettingsData?.data?.showAuthContent && solidSettingsData?.data?.authPagesLayout !== 'center' &&
                        <div className="w-full" style={{ zIndex: 1 }}>
                            <div className="grid">
                                <div className="col-8 mx-auto">
                                    {solidSettingsData?.data?.appSubtitle && <h1 className="solid-auth-image-subtitle m-0">{solidSettingsData?.data?.appSubtitle}</h1>}
                                    {solidSettingsData?.data?.appTitle && <h1 className="solid-auth-image-title mt-0">{solidSettingsData?.data?.appTitle}</h1>}
                                    {solidSettingsData?.data?.appDescription && <p className="solid-auth-image-helper-text">{solidSettingsData?.data?.appDescription}</p>}
                                </div>
                            </div>
                        </div>
                    }
                </div>
                {solidSettingsData?.data?.authPagesLayout === 'center' && <div className="solid-center-layout">
                    {authChildren}
                </div>}
                {solidSettingsData?.data?.authPagesLayout === 'right' &&
                    <div className='col-12 lg:col-7 xl:col-6 flex align-items-center justify-content-center solid-login-dark-bg'>
                        <div className="w-full">
                            {solidSettingsData?.data?.appLogoPosition === "in_form_view" &&
                                <div className="flex justify-content-center">
                                    <div className={`solid-logo flex align-items-center gap-3 ${solidSettingsData?.data?.appLogoPosition}`}>
                                        <Image
                                            alt="solid logo"
                                            src={solidSettingsData?.data?.appLogo || SolidLogo}
                                            className="relative"
                                            fill
                                        />
                                    </div>
                                </div>
                            }
                            {authChildren}
                        </div>
                    </div>
                }
            </div>
            {/* {solidSettingsData?.data?.showLegalLinks === true && */}
            <div className={`absolute hidden md:flex ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'solid-auth-footer flex flex-column sm:flex-row align-items-center justify-content-between' : 'solid-auth-footer-2 grid'}`}>
                {solidSettingsData?.data?.authPagesLayout !== 'left' &&
                    <div className={solidSettingsData?.data?.authPagesLayout !== 'center' ? 'col-6 lg:col-5  xl:col-6 flex justify-content-center' : ''}>
                        {solidSettingsData?.data?.showLegalLinks === true &&
                            <p className={`solid-auth-input-label text-sm m-0 ${solidSettingsData?.data?.authPagesLayout}`}>Made with <svg className="mx-1" width="12px" height="12px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" fill="#ff0000"></path> </g></svg> in Mumbai</p>
                        }
                    </div>
                }
                <div className={solidSettingsData?.data?.authPagesLayout !== 'center' ? 'col-6 flex justify-content-center' : ''}>
                    {solidSettingsData?.data?.showLegalLinks === true && <div className={`flex flex-column sm:flex-row align-items-center gap-1 sm:gap-5 solid-auth-subtitle mr-3 ${solidSettingsData?.data?.authPagesLayout === 'left' ? 'left' : ''}`}>
                        {solidSettingsData?.data?.appTnc !== "" && <p className="m-0 "> <Link className="text-sm no-underline font-normal" href={solidSettingsData?.data?.appTnc}>Terms of Service</Link></p>}
                        {solidSettingsData?.data?.appPrivacyPolicy !== "" && <p className="m-0 "> <Link className="text-sm no-underline font-normal" href={solidSettingsData?.data?.appPrivacyPolicy}>Privacy Policy.</Link></p>}
                    </div>
                    }
                    {solidSettingsData?.data?.copyright !== "" &&
                        <div className="mt-1">
                            <p className="m-0 text-sm font-normal">{solidSettingsData?.data?.copyright}</p>
                        </div>
                    }
                </div>
                {
                    solidSettingsData?.data?.authPagesLayout === 'left' &&
                    <div className={solidSettingsData?.data?.authPagesLayout !== 'center' ? 'col-6 lg:col-5 xl:col-6  flex justify-content-center' : ''}>
                        {solidSettingsData?.data?.showLegalLinks === true &&
                            <p className={`solid-auth-input-label text-sm m-0 right`}>Made with <svg className="mx-1" width="12px" height="12px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" fill="#ff0000"></path> </g></svg> in Mumbai</p>
                        }
                    </div>
                }
            </div >

            {/* } */}
            < Dialog
                visible={isRestricted}
                onHide={handleRegistration}
                header="Access Restricted"
                headerClassName="py-2" contentClassName="px-0 pb-0"
                className="solid-confirm-dialog "
                footer={
                    < div className="flex align-items-center justify-content-start" >
                        <Button label="Close" onClick={handleRegistration} size="small" />
                    </div >
                }
                draggable={false}
            >
                <Divider className="m-0" />
                <div className="p-4">
                    <p>Sign-up is not available. Please contact the admin.</p>
                </div>
            </Dialog >
        </div >
    )
}
