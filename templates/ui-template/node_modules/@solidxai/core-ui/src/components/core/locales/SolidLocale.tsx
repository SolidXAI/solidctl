

import React, { useEffect, useState } from 'react';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import "./solid-locale.css";
const SolidLocale = ({ solidFormViewMetaData, id, selectedLocale, setSelectedLocale, viewMode, createMode, handleLocaleChangeRedirect,
    applicableLocales, defaultEntityLocaleId, solidFormViewData, published }: { solidFormViewMetaData: any, id: string, selectedLocale: any, setSelectedLocale: any, viewMode: string, createMode: boolean, handleLocaleChangeRedirect: any, applicableLocales: any, defaultEntityLocaleId: string | null, solidFormViewData: any, published: string | null }) => {
    const [localeOptions, setLocaleOptions] = useState([]);
    const [defautlLocale, setDefaultLocale] = useState('');
    useEffect(() => {
        if (!applicableLocales) return;
        // Set dropdown options
        const localeOptions = applicableLocales.map((x: any) => ({
            label: x.displayName,
            value: x.locale,
        }));
        setLocaleOptions(localeOptions);

        if (createMode) {
            const defaultLocale = applicableLocales.find((x: any) => x.isDefault === 'yes');
            setSelectedLocale(defaultLocale?.locale || null);
            setDefaultLocale(defaultLocale?.displayName || '');
            return;
        }

        if (viewMode === 'edit' || viewMode === 'view') {
            //This is to check record entity matched defaultEntityLocaleId from query params & isDefault for default locale
            const matchedLocale = applicableLocales.find(
                (x: any) => x.isDefault === 'yes' && x.defaultEntityLocaleId == id
            );
            if (matchedLocale) {
                setSelectedLocale(matchedLocale.locale);
            }
        }
    }, [applicableLocales, id, viewMode, createMode]);

    const handleLocaleChange = (e: any) => {

        const newLocale = e.value;
        if (newLocale === selectedLocale) return;
        setSelectedLocale(newLocale);
        const targetDefaultEntityLocaleId = id === 'new' ? defaultEntityLocaleId : defaultEntityLocaleId || id;
        handleLocaleChangeRedirect(newLocale, targetDefaultEntityLocaleId, viewMode);
    };

    // utils/formatDate.ts
    const formatToDDMMYYWithTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    }


    return (
        <div className="flex flex-column p-0 m-0">
            <div className="flex justify-content-end gap-3">
            </div>
            {solidFormViewData && (viewMode === 'edit') &&
                (<div className="w-full" style={{ backgroundColor: 'var(--surface-ground)', margin: '10px 0', padding: 0, overflow:'hidden' }}>
                    {solidFormViewMetaData.data.solidView?.model?.draftPublishWorkflow &&
                        published !== null ? (
                        <li className="w-full text-left list-disc" style={{ padding: '10px 0px',margin: '0 20px', color: '#15803D' }}>
                            Editing <span className="font-bold">published version</span>
                        </li>
                    ) : (
                        <li className="w-full text-left list-disc" style={{ padding: '10px 0px',margin: '0 20px', color: '#EF4444' }}>
                            Editing <span className="font-bold">unpublished version</span>
                        </li>
                    )}
                </div>
                )
            }
            <div className="flex flex-column gap-2 mt-2" style={{ backgroundColor: 'var(--surface-ground)', padding: '0.5rem' }}>
                <h3 className="text-lg font-semibold p-0 m-0">Information</h3>
                <Divider className="my-2" />
                <div className="space-y-2">
                    <div className='flex align-items-center justify-content-between gap-2 p-2'>
                        <p className="text-sm font-bold text-gray-500 m-0">Created At</p>
                        <p className="text-sm m-0">{formatToDDMMYYWithTime(solidFormViewData?.data?.createdAt)}</p>
                    </div>
                    <div className='flex align-items-center justify-content-between gap-2 p-2'>
                        <p className="text-sm font-bold text-gray-500 m-0">Updated At</p>
                        <p className="text-sm m-0">
                            {formatToDDMMYYWithTime(solidFormViewData?.data?.updatedAt)}
                        </p>
                    </div>
                    <div className='flex align-items-center justify-content-between gap-2 p-2'>
                        <p className="text-sm font-bold text-gray-500 m-0">Published At</p>
                        <p className="text-sm m-0">{formatToDDMMYYWithTime(published ?? '')}</p>
                    </div>
                </div>

                {solidFormViewMetaData?.data?.solidView?.model?.internationalisation &&
                    <>
                        <h3 className="text-lg font-semibold mt-6 mb-2">Internationalisation</h3>
                        <label className="form-field-label">Locales</label>
                        <Dropdown
                            value={selectedLocale}
                            onChange={(e) => handleLocaleChange(e)}
                            options={localeOptions}
                            optionLabel="label"
                            placeholder="Select locale"
                            className="w-full"
                            //TODO: disable if createMode is true
                            disabled={createMode}
                        />
                        {viewMode === 'view' || createMode && (
                            <p className="text-sm text-gray-700 mt-0 ml-0"> By default record will be created in <b>{defautlLocale}</b></p>
                        )}
                    </>
                }
            </div>
            {/* <p className="text-sm font-bold text-gray-500 px-2">Fill in form another locale</p> */}
        </div>
    );
};

export default SolidLocale;
