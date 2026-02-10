
import { useState } from 'react';

const FieldSelector = ({ handleTypeSelect, modelMetaData }: any) => {

    const [selectedField, setSelectedField] = useState(null); // To store the selected field

    const solidFieldOptions = [
        { label: 'Integer', description: 'A whole number (int)', icon: 'pi pi-hashtag', value: 'int' },
        { label: 'Big Integer', description: 'A large whole number (bigint)', icon: 'pi pi-hashtag', value: 'bigint' },
        // { label: 'Float', description: 'A floating-point number', icon: 'pi pi-sort-numeric-up', value: 'float' },
        { label: 'Decimal', description: '64-bit floating-point numbers', icon: 'pi pi-sort-numeric-up', value: 'decimal' },
        { label: 'Short Text', description: 'Small text field', icon: 'pi pi-align-left', value: 'shortText' },
        { label: 'Long Text', description: 'A larger text field', icon: 'pi pi-align-justify', value: 'longText' },
        { label: 'Rich Text', description: 'A rich text editor', icon: 'pi pi-pencil', value: 'richText' },
        { label: 'JSON', description: 'JSON data format', icon: 'pi pi-code', value: 'json' },
        { label: 'Boolean', description: 'True or false value', icon: 'pi pi-check', value: 'boolean' },
        { label: 'Date', description: 'Date field', icon: 'pi pi-calendar', value: 'date' },
        { label: 'Datetime', description: 'Date and time field', icon: 'pi pi-clock', value: 'datetime' },
        { label: 'Time', description: 'Time picker', icon: 'pi pi-clock', value: 'time' },
        { label: 'Relation', description: 'Reference to another entity', icon: 'pi pi-sitemap', value: 'relation' },
        { label: 'Single Media', description: 'Single file upload (image, video)', icon: 'pi pi-image', value: 'mediaSingle' },
        { label: 'Multiple Media', description: 'Multiple file upload', icon: 'pi pi-images', value: 'mediaMultiple' },
        { label: 'Email', description: 'Email field', icon: 'pi pi-envelope', value: 'email' },
        { label: 'Password', description: 'Password input field', icon: 'pi pi-lock', value: 'password' },
        { label: 'Static Selection', description: 'Predefined selection of values', icon: 'pi pi-list', value: 'selectionStatic' },
        { label: 'Dynamic Selection', description: 'Selection from a dynamic list', icon: 'pi pi-list', value: 'selectionDynamic' },
        { label: 'Computed', description: 'A computed field based on other data', icon: 'pi pi-cog', value: 'computed' },
        // { label: 'External ID', description: 'An external identifier', icon: 'pi pi-key', value: 'externalId' },
        { label: 'UUID', description: 'Unique Identifier', icon: 'pi pi-key', value: 'uuid' }

    ];


    const handleFieldSelect = (fieldValue: any) => {
        setSelectedField(fieldValue);
    };

    return (
        <div className='p-4' style={{ height: '80vh', overflowY: 'scroll' }}>
            <p className="form-wrapper-heading text-base m-0">Select Field Type</p>
            <div className='formgrid grid'>
                {solidFieldOptions.map((field, index) => (
                    <div className="field col-12  md:col-6 mt-3" key={index}>
                        <div
                            className={`flex align-items-center gap-3 type-field-card ${selectedField === field.value ? 'selected' : ''}`}
                            onClick={() => handleTypeSelect(field.value, field.label)}
                        >
                            <i className={`pi ${field.icon}`}></i>
                            <div className=''>
                                <p className='text-sm m-0 font-bold'>{field.label}</p>
                                <p className='text-xs'>{field.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FieldSelector;
