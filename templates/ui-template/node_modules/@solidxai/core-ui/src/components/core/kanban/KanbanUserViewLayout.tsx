import { useFormik } from "formik";
import { Button } from "primereact/button";
import { useRef } from "react";
import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { Toast } from "primereact/toast";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import showToast from "../../../helpers/showToast";

export const KanbanUserViewLayout = ({ solidKanbanViewMetaData, setLayoutDialogVisible }: any) => {
    const toast = useRef<Toast>(null);
    const entityApi = createSolidEntityApi("userViewMetadata");
    const { useUpsertSolidEntityMutation } = entityApi;
    const [upsertUserView] = useUpsertSolidEntityMutation();

    if (!solidKanbanViewMetaData?.data?.solidView) return null;

    const solidView = solidKanbanViewMetaData.data.solidView;

    const formik = useFormik({
        initialValues: {
            layoutString: JSON.stringify(solidView.layout, null, 2),
        },
        onSubmit: async (values) => {
            const parsedLayout = JSON.parse(values.layoutString);
            try {
                if (solidView.id) {
                    const response = await upsertUserView({
                        viewMetadataId: solidView.id,
                        layout: JSON.stringify(parsedLayout),
                    }).unwrap();
                    if (response.statusCode === 200) {
                        showToast(toast, "success", ERROR_MESSAGES.LAYOUT, ERROR_MESSAGES.FORM_LAYOUT_UPDATE);
                        setLayoutDialogVisible(false);
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error(ERROR_MESSAGES.UPDATE_FAILED, error);
            }
        },
    });

    return (
        <>
            <Toast ref={toast} />
            <form onSubmit={formik.handleSubmit}>
                <CodeMirror
                    value={formik.values.layoutString}
                    height="500px"
                    theme={oneDark}
                    style={{ fontSize: '10px' }}
                    extensions={[javascript(), EditorView.lineWrapping]}
                    onChange={(value) => {
                        formik.setFieldValue("layoutString", value);
                    }}
                />
                <div className="pt-3 flex gap-2">
                    <Button type="submit" label="Apply" size="small" />
                    <Button
                        type="button"
                        outlined
                        label="Cancel"
                        size="small"
                        onClick={() => setLayoutDialogVisible(false)}
                    />
                </div>
            </form>
        </>
    );
};