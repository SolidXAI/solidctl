

import { Message } from "primereact/message";
import { FormikObject, SolidFieldProps } from "./fields/ISolidField";
import { SolidFormFieldRenderExtension } from "./SolidFormFieldRenderExtension";

export type SolidFormFieldRenderProps = {
    formik: FormikObject;
    fieldContext: SolidFieldProps
}

export const SolidFormFieldRender = ({ formik, fieldContext }: any) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';


    let viewWidget = fieldLayoutInfo.attrs.viewWidget;
    let editWidget = fieldLayoutInfo.attrs.editWidget;
    if (!editWidget) {
        editWidget = 'DefaultTimeFormEditWidget';
    }
    if (!viewWidget) {
        viewWidget = 'DefaultShortTextFormViewWidget';
    }
    const viewMode: string = fieldContext.viewMode;


    return (
        <>
            <div className={className}>
                {viewMode === "view" &&
                    // renderExtensionRenderMode(viewWidget, formik)
                    <SolidFormFieldRenderExtension widget={viewWidget} formik={formik} fieldContext={fieldContext} />
                }
                {viewMode === "edit" &&
                    <>
                        {editWidget &&
                            // this.renderExtensionRenderMode(editWidget, formik)
                            <SolidFormFieldRenderExtension widget={editWidget} formik={formik}  fieldContext={fieldContext}/>
                        }
                        {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                            <div className="absolute mt-1">
                                <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                            </div>
                        )}
                    </>
                }
            </div>
        </>
    );
};
