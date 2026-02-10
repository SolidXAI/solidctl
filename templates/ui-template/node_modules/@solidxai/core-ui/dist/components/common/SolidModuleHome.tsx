

import { useSession } from "../../hooks/useSession";
import styles from './solidModuleHome.module.css'
import { Button } from 'primereact/button';
import { DocsSvg } from '../Svg/DocsSvg';
import { SettingsSvg } from '../Svg/SettingsSvg';
import { DevDocs } from '../Svg/DevDocs';
import { HomePageModuleSvg } from '../Svg/HomePageModuleSvg';
import Link from "./Link";
import { useState } from 'react';
import { SolidAccountSettings } from '../core/common/SolidAccountSettings/SolidAccountSettings';
import { useDispatch, useSelector } from "react-redux";
import { showNavbar, toggleNavbar } from "../../redux/features/navbarSlice";

type SolidModuleHomeProps = {
    moduleName?: string;
};

export const SolidModuleHome = ({ moduleName = "Dashboard" }: SolidModuleHomeProps) => {
    const { data: session, status } = useSession();
    const dispatch = useDispatch();
    const visibleNavbar = useSelector((state: any) => state.navbarState?.visibleNavbar);
    //@ts-ignore
    const user = session?.user?.username;
    const [showAccountSettings, setShowAccountSettings] = useState(false);

    const toggleBothSidebars = () => {
        if (visibleNavbar) {
            dispatch(toggleNavbar());   // close both
        } else {
            dispatch(showNavbar());     // open both
        }
    };

    return (
        <div className="h-screen surface-0 overflow-y-auto">
            <div className="page-header" style={{ borderBottom: '1px solid var(--primary-light-color)' }}>
                <div className='flex align-items-center gap-2'>
                    <div className="apps-icon block md:hidden cursor-pointer" onClick={toggleBothSidebars}>
                        <i className="pi pi-th-large"></i>
                    </div>
                    <p className="m-0 view-title solid-text-wrapper">
                        {moduleName}
                    </p>
                </div>
            </div>
            <div className="p-4 md:p-5 flex flex-column gap-4">
                <div className={styles.solidModuleWelcomeSection}>
                    <div className='flex flex-column gap-2 pr-3 lg:pr-0'>
                        <h3 className={styles.solidModuleHomeTitle1}>
                            Welcome, {status === "loading" ? "." : user}
                        </h3>
                        <p className='m-0 w-35rem text-sl'>
                            This is the home page for the {moduleName} module. You can find documentation and settings below.
                        </p>
                    </div>
                    <div className={styles.homeSvg}>
                        <HomePageModuleSvg />
                    </div>
                </div>

                {/* Cards */}
                <div className='grid'>
                    {[{
                        icon: <DocsSvg />,
                        title: 'Admin Docs',
                        description: 'Explore the administrator documentation to manage and configure your system',
                        class: styles.dashboardCardOne,
                        url: 'https://docs.solidxai.com/docs/admin-docs/'
                    }, {
                        icon: <DevDocs />,
                        title: 'Dev Docs',
                        description: 'Dive into the developer documentation to build, extend, and integrate with the platform',
                        class: styles.dashboardCardTwo,
                        url: 'https://docs.solidxai.com/docs/developer-docs/'
                    }, {
                        icon: <SettingsSvg />,
                        title: 'Settings',
                        description: 'Access and update your account settings, preferences, and profile information',
                        class: styles.dashboardCardThree,
                        type: 'popup'
                    }].map((card, i) => (
                        <div className='col-12 md:col-6 xl:col-4' key={i}>
                            <div className={`${styles.solidModuleHomeColorCards} ${card.class}`}>
                                <div>
                                    <div className={styles.solidModuleHomeCardSvgWrapper}>{card.icon}</div>
                                    <h3 className={`${styles.solidModuleHomeTitle1} mt-4`}>{card.title}</h3>
                                    <p className='mb-0 mt-2 mr-2 text-xs'>
                                        {card.description}
                                    </p>
                                </div>
                                <div>
                                    {card.url ? (
                                        <Link href={card.url} target="_blank" rel="noopener noreferrer">
                                            <Button outlined label='Explore' size='small' icon="pi pi-arrow-right" iconPos='right' className="font-bold" style={{ background: 'var(--solid-module-home-add-button-bg)' }} />
                                        </Link>
                                    ) : (
                                        <Button
                                            outlined
                                            label='Open'
                                            size='small'
                                            icon="pi pi-cog"
                                            iconPos='right'
                                            className="font-bold"
                                            style={{ background: 'var(--solid-module-home-add-button-bg)' }}
                                            onClick={() => {
                                                if (card.type === 'popup') {
                                                    setShowAccountSettings(true);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {showAccountSettings &&
                <SolidAccountSettings
                    showProfileSettingsDialog={showAccountSettings}
                    setShowProfileSettingsDialog={setShowAccountSettings}
                />
            }
        </div>
    )
}
