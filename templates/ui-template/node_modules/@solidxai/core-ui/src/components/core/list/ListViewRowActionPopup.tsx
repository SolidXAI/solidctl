
import { Button } from "primereact/button"
import { getExtensionComponent } from "../../../helpers/registry";


export const ListViewRowActionPopup = ({ context }: any) => {

    //Note if there is not custom component the need a api call to server 
    // GenerateModuleCode  is my custom compoennt that will trigger code generation 
    //Render dynamic lsit action contains code for dynamically rendering compoennt or retunr a fall back

    const triggerServerAction = () => {

    }

    let DynamicWidget = getExtensionComponent(context?.rowAction?.action);
    const widgetProps = {
        context: context
    }

    return (
        <div>
            {
                context?.rowAction?.action ?
                    DynamicWidget && <DynamicWidget {...widgetProps} />
                    :
                    <>
                        <h1>{context?.modelName}</h1>
                        <h1>{context?.moduleName}</h1>
                        <div className="flex justify-content-center">
                            <Button label="Confirm" icon="pi pi-check" className='small-button' severity="danger" autoFocus onClick={triggerServerAction} />
                            <Button label="Cancel" icon="pi pi-times" className='small-button' onClick={() => context.closeCustomRowActionPopup()} />
                        </div>
                    </>
            }
        </div>
    )
}


