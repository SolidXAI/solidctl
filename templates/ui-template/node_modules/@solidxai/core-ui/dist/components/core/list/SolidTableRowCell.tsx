import { Tooltip } from "primereact/tooltip";

const SolidTableRowCell = ({ value, truncateAfter }: { value: string; truncateAfter?: number }) => {
    const safeValue = value !== null && value !== undefined ? String(value) : "";
    // Utility function to detect if value contains HTML
    const isHTML = (str: string) => /<\/?[a-z][\s\S]*>/i.test(str);

    // Utility function to strip HTML tags
    const stripHTML = (str: string) => str.replace(/<[^>]+>/g, '');

    const displayValue = isHTML(safeValue) ? stripHTML(safeValue) : safeValue;

    return (
        <div className="flex align-items-center">
            <div
                className="solid-table-row"
                style={truncateAfter ? { maxWidth: `${truncateAfter}ch` } : {}}
            // title={truncateAfter ? displayValue : undefined}
            >
                {displayValue}
            </div>
            {truncateAfter && displayValue.length > truncateAfter &&
                <>
                    <Tooltip target=".solid-field-tooltip-icon" />
                    <i className="pi pi-info-circle solid-field-tooltip-icon"
                        data-pr-tooltip={displayValue}
                    />
                </>
            }
        </div>
    );

};

export default SolidTableRowCell;