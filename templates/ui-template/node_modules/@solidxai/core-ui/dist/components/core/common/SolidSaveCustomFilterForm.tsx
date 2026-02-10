
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { useState } from "react";

interface SolidSaveCustomFilterFormProps {
    currentSavedFilterData: any,
    handleSaveFilter: ({ }) => void;
    closeDialog: any
}

export const SolidSaveCustomFilterForm: React.FC<SolidSaveCustomFilterFormProps> = ({ currentSavedFilterData, handleSaveFilter, closeDialog }) => {
    const [formValues, setFormValues] = useState({ name: currentSavedFilterData ? currentSavedFilterData.name : "", isPrivate: currentSavedFilterData ? currentSavedFilterData.isPrivate : false });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = {
            id: currentSavedFilterData ? currentSavedFilterData.id : null,
            name: formValues.name,
            isPrivate: formValues.isPrivate === true ? true : "",
        }
        handleSaveFilter(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-column gap-2">
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Filter Title"
                    className="p-inputtext p-inputtext-sm p-component"
                    value={formValues.name}
                    onChange={handleChange}
                    readOnly={currentSavedFilterData}
                />
            </div>
            <div className="mt-3 flex align-items-center ">
                <Checkbox
                    inputId="isPrivate"
                    name="isPrivate"
                    checked={formValues.isPrivate}
                    onChange={(e: any) => handleChange(e)}
                >
                </Checkbox>
                <label htmlFor="isPrivate" className="ml-2">Is Private</label>
            </div>
            <div className="mt-3 flex align-items-center gap-2">
                <Button
                    type="submit"
                    label={currentSavedFilterData ? "Update" : "Save"}
                    size="small"
                />
                <Button
                    type="button"
                    label="Cancel"
                    size="small"
                    outlined
                    onClick={() => closeDialog()}
                />
            </div>
        </form>
    );
};

