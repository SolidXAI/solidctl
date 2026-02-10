
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { OverlayPanel } from "primereact/overlaypanel";
import { useRef, useState } from "react";

const FilterMenu = () => {
    const op = useRef<any>(null);
    const [visible, setVisible] = useState(false);

    const filters = [
        { label: 'On Time Off', onClick: () => handleFilterClick('On Time Off') },
        { label: 'At Work', onClick: () => handleFilterClick('At Work') },
        { label: 'My Team', onClick: () => handleFilterClick('My Team') },
        { label: 'My Departments', onClick: () => handleFilterClick('My Departments') },
        { label: 'Newly Hired', onClick: () => handleFilterClick('Newly Hired') },
        { label: 'Fixed Hours', onClick: () => handleFilterClick('Fixed Hours') },
        { label: 'Flexible Hours', onClick: () => handleFilterClick('Flexible Hours') },
        { label: 'Add Custom Filters', onClick: () => handleFilterClick('Add Custom Filters') }
    ];

    const groupBy = [
        { label: 'Manager', onClick: () => handleGroupByClick('Manager') },
        { label: 'Department', onClick: () => handleGroupByClick('Department') },
        { label: 'Job', onClick: () => handleGroupByClick('Job') },
        { label: 'Skills', onClick: () => handleGroupByClick('Skills') },
        { label: 'Start Date', onClick: () => handleGroupByClick('Start Date') },
        { label: 'Tags', onClick: () => handleGroupByClick('Tags') }
    ];

    const favourites = [
        { label: 'Save Current Search', onClick: () => handleFavouritesClick('Save Current Search') }
    ];

    // Example function definitions
    function handleFilterClick(filter: string) {


        switch (filter) {
            case 'Add Custom Filters':
                setVisible(true);
                break;

            default:
                break;
        }
    }

    function handleGroupByClick(group: string) {

    }

    function handleFavouritesClick(favourite: string) {

    }

    return (
        <div>
            <Button
                icon="pi pi-cog"
                className="transparent-background"
                onClick={(e: any) => op?.current?.toggle(e)}
                aria-haspopup
                aria-controls="popup_menu"
            />
            {/* <Button type="button" icon="pi pi-image" label="Image" onClick={(e: any) => op?.current?.toggle(e)} /> */}
            <OverlayPanel ref={op} className="filterDropdown">
                <div className="grid m-0">
                    {/* Column 1: Filters */}
                    <div className="col-12 md:col-4 lg:col-4">
                        <h3><span className=" pi pi-filter"></span> Filters</h3>
                        <ul className="custom-list">
                            {filters.map((item, index) => (
                                <a onClick={item.onClick}>
                                    <li key={index}>{item.label}</li>
                                </a>
                            ))}
                        </ul>
                    </div>

                    {/* Column 2: Group By */}
                    <div className="col-12 md:col-4 lg:col-4">
                        <h3><span className=" pi pi-clone"></span> Group by</h3>
                        <ul className="custom-list">
                            {groupBy.map((item, index) => (
                                <a onClick={item.onClick}>
                                    <li key={index}>{item.label}</li>
                                </a>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Favourites */}
                    <div className="col-12 md:col-4 lg:col-4">
                        <h3> <span className=" pi pi-star"></span> Favourites</h3>
                        <ul className="custom-list">
                            {favourites.map((item, index) => (
                                <a onClick={item.onClick}>
                                    <li key={index}>{item.label}</li>
                                </a>
                            ))}
                        </ul>
                    </div>
                </div>
            </OverlayPanel>
            <Dialog header="Add Custom Filter" visible={visible} style={{ width: '50vw' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                {/* <FilterComponent></FilterComponent> */}
            </Dialog>

            {/* <Dialog
                visible={visible}
                modal
                onHide={() => { if (!visible) return; setVisible(false); }}
                content={({ hide }) => (
                    <FilterComponent></FilterComponent>
                )}
            ></Dialog> */}
        </div>
    );
};

export default FilterMenu;
