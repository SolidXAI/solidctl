
import { Dialog } from "primereact/dialog";
import { useState } from "react";


export const SolidListViewOptions = ({ }: any) => {

    const [visible, setVisible] = useState<boolean>(false);

    const [componentsToRender, setComponentsToRender] = useState(["Header", "NonExistentComponent"]);

    return (
        <div className="card flex justify-content-center">
            <i className="pi pi-cog" onClick={() => setVisible(true)}></i>

            <Dialog header="Header" visible={visible} style={{ width: '50vw' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                <p className="m-0">
                    ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                    consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
                <div>
                   
                </div>

            </Dialog>
        </div>
    )

}