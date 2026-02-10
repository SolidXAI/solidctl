
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { RadioButton } from 'primereact/radiobutton';
import { useRef } from 'react';
interface Props {
    sizeOptions: { label: string; value: string, image: string }[];
    setSize: (value: string) => void;
    size: string;
    viewModes: { label: string; value: string, image: string }[];
    setView: (value: string) => void;
    view: string;
}
export const SolidLayoutViews = ({ sizeOptions, setSize, size, viewModes, setView, view }: Props) => {
    const op = useRef(null);

    return (
        <div className="position-relative">
            <Button
                type="button"
                size='small'
                severity='secondary'
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M14.9016 13.1969L10.8031 9.09845L14.9016 5L19 9.09845L14.9016 13.1969ZM5 11.7461V5.94301H10.8031V11.7461H5ZM12.2539 19V13.1969H18.057V19H12.2539ZM5 19V13.1969H10.8031V19H5ZM6.45078 10.2953H9.35233V7.39378H6.45078V10.2953ZM14.9197 11.1658L16.9689 9.11658L14.9197 7.06736L12.8705 9.11658L14.9197 11.1658ZM13.7047 17.5492H16.6062V14.6477H13.7047V17.5492ZM6.45078 17.5492H9.35233V14.6477H6.45078V17.5492Z" fill="#4B4D52" />
                    </svg>
                }
                className='custom-icon-button'
                outlined
                // @ts-ignore
                onClick={(e) => op.current.toggle(e)}
            />
            <OverlayPanel ref={op} className='solid-header-dropdown-panel'>
                <div className='secondary-border-bottom p-1'>
                    <p className='px-3 pt-2'>Density</p>
                    <div className="flex flex-column gap-1">
                        {sizeOptions.map((option) => (
                            <div key={option.value} className={`flex align-items-center ${option.value === size ? 'solid-active-view' : 'solid-view'}`}>
                                <RadioButton
                                    inputId={option.value}
                                    name="sizes"
                                    value={option.value}
                                    onChange={(e) => setSize(e.value)}
                                    checked={option.value === size}
                                />
                                <label htmlFor={option.value} className="ml-2 flex align-items-center justify-content-between w-full">
                                    {option.label}
                                    <img
                                        src={option.image}
                                        alt={option.value}
                                        className='img-fluid position-relative'
                                        style={{ width: '2.75rem' }}
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className='p-1'>
                    <p className='px-3 pt-2'>View Mode</p>
                    <div className="flex flex-column gap-1">
                        {viewModes.map((option) => (
                            <div key={option.value} className={`flex align-items-center ${option.value === view ? 'solid-active-view' : 'solid-view'}`}>
                                <RadioButton
                                    inputId={option.value}
                                    name="views"
                                    value={option.value}
                                    onChange={(e) => setView(e.value)}
                                    checked={option.value === view}
                                />
                                <label htmlFor={option.value} className="ml-2 flex align-items-center justify-content-between w-full">
                                    {option.label}
                                    <img
                                        src={option.image}
                                        alt={option.value}
                                        className='img-fluid position-relative'
                                        style={{ width: '2.75rem' }}
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );
}
