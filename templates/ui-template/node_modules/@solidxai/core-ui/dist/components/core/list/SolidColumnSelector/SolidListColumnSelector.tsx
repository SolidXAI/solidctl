import { useFormik } from 'formik';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import React, { useRef, useState } from 'react'
import { createSolidEntityApi } from '../../../../redux/api/solidEntityApi';
import { Toast } from "primereact/toast";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import styles from './SolidListColumnSelector.module.css'
import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import showToast from "../../../../helpers/showToast";

interface FieldMetadata {
    displayName: string;
}

interface FilterColumns {
    name: string;
    key: string;
}

export const SolidListColumnSelector = ({ listViewMetaData, customizeLayout }: any) => {
    console.log("listViewMetaData column selector", listViewMetaData);

    const toast = useRef<Toast>(null);
    const [isDragging, setIsDragging] = useState(false);
    const entityApi = createSolidEntityApi('userViewMetadata');
    const {
        useUpsertSolidEntityMutation
    } = entityApi;

    const [upsertUserView, { isLoading, error: viewCreateError, isSuccess, data: data }] = useUpsertSolidEntityMutation();

    if (!listViewMetaData) {
        return;
    }
    if (!listViewMetaData.data) {
        return;
    }

    const solidView = listViewMetaData?.data?.solidView;

    // This is a key value map of field name vs field metadata.
    const solidFieldsMetadata = listViewMetaData?.data?.solidFieldsMetadata as Record<string, FieldMetadata>;


    if (!solidView || !solidFieldsMetadata) {
        return;
    }

    const checkedFieldNames = new Set(solidView.layout.children.map((col: { attrs: { name: string } }) => col.attrs.name));

    const solidListColumns: FilterColumns[] = Object.entries(solidFieldsMetadata).map(([key, field]) => ({
        name: field.displayName,
        key,
    }));

    const [fields, setFields] = useState<FilterColumns[]>(() => {
        const selectedOrder = solidView.layout.children.map((child: any) => child.attrs.name);

        const allColumns: FilterColumns[] = Object.entries(solidFieldsMetadata).map(([key, field]) => ({
            name: field.displayName,
            key,
        }));

        const selectedFields: FilterColumns[] = [];
        const remainingFields: FilterColumns[] = [];

        const usedKeys = new Set<string>();

        // First, add selected fields in the order of solidView
        for (const key of selectedOrder) {
            const column = allColumns.find(col => col.key === key);
            if (column) {
                selectedFields.push(column);
                usedKeys.add(key);
            }
        }

        // Then, add remaining fields that are not selected
        for (const col of allColumns) {
            if (!usedKeys.has(col.key)) {
                remainingFields.push(col);
            }
        }

        return [...selectedFields, ...remainingFields];
    });

    const formik = useFormik({
        initialValues: {
            selectedColumns: solidListColumns.filter(col => checkedFieldNames.has(col.key)),
        },
        onSubmit: async (values) => {
            const selectedKeys = values.selectedColumns.map(col => col.key);

            // Step 1: Extract current children
            const currentChildren = solidView.layout.children;

            // Step 2: Create a map of all available metadata
            const allFieldMeta = solidFieldsMetadata;

            // Step 3: Filter children to include only selected keys
            const newChildren = fields
                .filter(col => selectedKeys.includes(col.key))
                .map(({ key }) => {
                    const existingChild = currentChildren.find((child: any) => child.attrs.name === key);
                    if (existingChild) return existingChild;
                
                    // @ts-ignore
                    const fieldType = allFieldMeta[key]?.type;
                    const isTextType = fieldType === "shortText" || fieldType === "longText" || fieldType ==="selectionStatic" || fieldType ==="selectionDynamic";
                
                    return {
                        type: 'field',
                        attrs: {
                            name: key,
                            label: allFieldMeta[key]?.displayName || key,
                            ...(isTextType ? { isSearchable: true } : {}),
                        },
                    };
                });
                
            // Now build updated solidView
            const updatedView = {
                layout: {
                    ...solidView.layout,
                    children: newChildren
                }
            };

            try {
                if (listViewMetaData?.data?.solidView?.id) {
                    // Update existing user view
                    const response = await upsertUserView({
                        viewMetadataId: listViewMetaData?.data?.solidView?.id,
                        layout: JSON.stringify(updatedView.layout),
                    }).unwrap();
                    if (response.statusCode === 200) {
                        showToast(toast, "success", ERROR_MESSAGES.LAYOUT, ERROR_MESSAGES.FORM_LAYOUT_UPDATE);
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error(ERROR_MESSAGES.UPDATING_USER, error);
            }
        },
    });

    const onDragEnd = (result: DropResult) => {
        setIsDragging(false);
        if (!result.destination) return;
        const reordered = [...fields];
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setFields(reordered);
    };

    return (
        <>
            <Toast ref={toast} />
            <form onSubmit={formik.handleSubmit} className="flex flex-column gap-1 px-2">
                <DragDropContext onDragEnd={onDragEnd} onDragStart={() => setIsDragging(true)}>
                    <Droppable droppableId="columns">
                        {(provided): React.ReactElement => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`flex flex-column cogwheel-column-filter px-1 ${isDragging ? styles.SolidColumnDragContextActive : ''}`}
                                style={{ maxHeight: 400, overflowY: 'auto' }}
                            >
                                {fields.map((column, index) => (
                                    <Draggable key={column.key} draggableId={column.key} index={index}>
                                        {(provided, snapshot): React.ReactElement => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`flex align-items-center justify-content-between gap-3 px-3 py-2 ${snapshot.isDragging ? styles.SolidColumnDraggedActiveElement : ''}`}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                }}
                                            >
                                                <div className='flex align-items-center gap-1'>
                                                    <Checkbox
                                                        inputId={column.key}
                                                        name="selectedColumns"
                                                        value={column}
                                                        onChange={() => {
                                                            const isChecked = formik.values.selectedColumns.some(item => item.key === column.key);
                                                            formik.setFieldValue(
                                                                "selectedColumns",
                                                                isChecked
                                                                    ? formik.values.selectedColumns.filter(item => item.key !== column.key)
                                                                    : [...formik.values.selectedColumns, column]
                                                            );
                                                        }}
                                                        checked={formik.values.selectedColumns.some(item => item.key === column.key)}
                                                        className="text-base flex align-items-center"
                                                    />
                                                    <label htmlFor={column.key} className="ml-2 text-base">
                                                        {column.name}
                                                    </label>
                                                </div>
                                                <DragActive active={snapshot.isDragging} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <div className="p-3 flex gap-2">
                    <Button type='submit' label="Apply" size="small" />
                    <Button type='button' outlined label="Cancel" size="small"
                        // @ts-ignore
                        onClick={(e) => customizeLayout.current.hide(e)}
                    />
                </div>
            </form>
        </>
    )
}

const DragActive = ({ active }: any) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.46354 11.7331C7.46354 12.0997 7.33299 12.4136 7.07187 12.6747C6.81076 12.9359 6.49687 13.0664 6.13021 13.0664C5.76354 13.0664 5.44965 12.9359 5.18854 12.6747C4.92743 12.4136 4.79688 12.0997 4.79688 11.7331C4.79688 11.3664 4.92743 11.0525 5.18854 10.7914C5.44965 10.5303 5.76354 10.3997 6.13021 10.3997C6.49687 10.3997 6.81076 10.5303 7.07187 10.7914C7.33299 11.0525 7.46354 11.3664 7.46354 11.7331ZM7.46354 7.73307C7.46354 8.09974 7.33299 8.41363 7.07187 8.67474C6.81076 8.93585 6.49687 9.06641 6.13021 9.06641C5.76354 9.06641 5.44965 8.93585 5.18854 8.67474C4.92743 8.41363 4.79688 8.09974 4.79688 7.73307C4.79688 7.36641 4.92743 7.05252 5.18854 6.79141C5.44965 6.5303 5.76354 6.39974 6.13021 6.39974C6.49687 6.39974 6.81076 6.5303 7.07187 6.79141C7.33299 7.05252 7.46354 7.36641 7.46354 7.73307ZM7.46354 3.73307C7.46354 4.09974 7.33299 4.41363 7.07187 4.67474C6.81076 4.93585 6.49687 5.06641 6.13021 5.06641C5.76354 5.06641 5.44965 4.93585 5.18854 4.67474C4.92743 4.41363 4.79688 4.09974 4.79688 3.73307C4.79688 3.36641 4.92743 3.05252 5.18854 2.79141C5.44965 2.5303 5.76354 2.39974 6.13021 2.39974C6.49687 2.39974 6.81076 2.5303 7.07187 2.79141C7.33299 3.05252 7.46354 3.36641 7.46354 3.73307Z" fill="var(--icon-color)" fill-opacity={active ? "0.75" : "0.25"} />
            <path d="M11.737 11.7331C11.737 12.0997 11.6064 12.4136 11.3453 12.6747C11.0842 12.9359 10.7703 13.0664 10.4036 13.0664C10.037 13.0664 9.72309 12.9359 9.46198 12.6747C9.20087 12.4136 9.07031 12.0997 9.07031 11.7331C9.07031 11.3664 9.20087 11.0525 9.46198 10.7914C9.72309 10.5303 10.037 10.3997 10.4036 10.3997C10.7703 10.3997 11.0842 10.5303 11.3453 10.7914C11.6064 11.0525 11.737 11.3664 11.737 11.7331ZM11.737 7.73307C11.737 8.09974 11.6064 8.41363 11.3453 8.67474C11.0842 8.93585 10.7703 9.06641 10.4036 9.06641C10.037 9.06641 9.72309 8.93585 9.46198 8.67474C9.20087 8.41363 9.07031 8.09974 9.07031 7.73307C9.07031 7.36641 9.20087 7.05252 9.46198 6.79141C9.72309 6.5303 10.037 6.39974 10.4036 6.39974C10.7703 6.39974 11.0842 6.5303 11.3453 6.79141C11.6064 7.05252 11.737 7.36641 11.737 7.73307ZM11.737 3.73307C11.737 4.09974 11.6064 4.41363 11.3453 4.67474C11.0842 4.93585 10.7703 5.06641 10.4036 5.06641C10.037 5.06641 9.72309 4.93585 9.46198 4.67474C9.20087 4.41363 9.07031 4.09974 9.07031 3.73307C9.07031 3.36641 9.20087 3.05252 9.46198 2.79141C9.72309 2.5303 10.037 2.39974 10.4036 2.39974C10.7703 2.39974 11.0842 2.5303 11.3453 2.79141C11.6064 3.05252 11.737 3.36641 11.737 3.73307Z" fill="var(--icon-color)" fill-opacity={active ? "0.75" : "0.25"} />
        </svg>
    )
}