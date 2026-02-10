"use client"
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import React, { useEffect, useRef, useState } from 'react'
import { SolidCustomImportHeader } from './SolidCustomImportHeader';
import { useDispatch } from 'react-redux';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Button } from 'primereact/button';
import { closePopup } from "@solidxai/core-ui";
import { useTriggerHierarchyImportMutation, useValidateHierarchyImportMutation } from "../../../../redux/hierarchyImportTransactionApi";

interface VenueConflict {
    venueName: string;
    combinations: {
        leader: string;
        regionalHead: string;
        areaManager: string;
        venueManager: string;
        manager: string;
    }[];
}

export interface RowError {
    rowNumber: number;
    field: string;
    value: string;
    message: string;
}

interface ValidationResult {

    canProceed: boolean;

    headerValidation: any;

    newVenuesCount: number;
    venuesWithHierarchyConflictCount: number;

    newVenues: string[];
    venuesWithHierarchyConflict: VenueConflict[];

    rowErrors?: RowError[];

}

export const ImportHierarchyComponent = (e: any): React.JSX.Element => {
    console.log("form data", e);

    // const { formData } = props;
    const dispatch = useDispatch();

    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    const [validateImport, { isLoading: isValidating }] = useValidateHierarchyImportMutation();
    const [triggerImport, { isLoading: isTriggering }] = useTriggerHierarchyImportMutation();

    const hasValidatedRef = useRef(false);

    // Auto-trigger validation when component mounts
    useEffect(() => {
        console.log(`Timepass...`);

        if (e.params?.id && !hasValidatedRef.current) {
            hasValidatedRef.current = true;
            runValidation();
        }
    }, [e.params?.id]);

    const runValidation = async () => {
        try {
            const result = await validateImport({ id: e.params?.id }).unwrap();
            setValidationResult(result?.data);
        } catch (error: any) {
            console.error('Validation failed:', error);
            setValidationResult({
                canProceed: false,
                headerValidation: {},
                newVenuesCount: 0,
                venuesWithHierarchyConflictCount: 0,
                newVenues: [],
                venuesWithHierarchyConflict: [],
            });
        }
    };

    const handleContinueImport = async () => {
        if (!e.params?.id) return;

        try {
            await triggerImport({ id: e.params?.id }).unwrap();
            dispatch(closePopup());
            // You can add success toast notification here
            // toast.success('Import job has been queued successfully');
        } catch (error: any) {
            console.error('Import failed:', error);
            // You can add error toast notification here
            // toast.error('Failed to trigger import');
        }
    };

    const getUniqueCombinations = (combinations: any[]) => {
        const uniqueMap = new Map();
        combinations.forEach(combo => {
            const key = `${combo.leader}-${combo.regionalHead}-${combo.areaManager}-${combo.venueManager}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, combo);
            }
        });
        return Array.from(uniqueMap.values());
    };

    console.log("validationResult", validationResult);
    return (
        <div>
            <SolidCustomImportHeader />

            <div className="p-4">

                {/* Loading State */}
                {isValidating && (
                    <div className="flex flex-column align-items-center justify-content-center py-6">
                        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                        <p className="mt-3 text-600">Validating import data...</p>
                    </div>
                )}

                {/* Validation Results */}
                {!isValidating && validationResult && (
                    <div className="flex flex-column gap-3">
                        {/* Errors Section (STOP) */}
                        {/* Errors Section (STOP) - excluding conflict errors if no actual conflicts */}
                        {!validationResult?.canProceed && !validationResult?.headerValidation?.ok && (
                            <div className='overflow-x-auto py-3'>
                                <div className="px-3 py-2 bg-red-50 border-round mb-1 flex align-items-center gap-1">
                                    <i className="pi pi-times-circle text-red-500 mr-2"></i>
                                    <span className="text-red-500">{validationResult?.headerValidation?.note}</span>
                                </div>

                                {validationResult?.headerValidation?.expectedHeaders?.length > 0 && (
                                    <div className='mt-3'>
                                        <div className="font-bold white-space-nowrap">Expected Headers:</div>
                                        <div className='flex mt-2'>
                                            {validationResult?.headerValidation?.expectedHeaders.map((header: string, idx: number) => (
                                                <div key={idx} className={`px-2 py-1 flex-shrink-0 border border-right-1 border-top-1 border-bottom-1 border-gray-300 ${idx === 0 ? 'border-left-1' : ''}`}>
                                                    <span className="text-sm white-space-nowrap">{header}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* 
                                {validationResult?.headerValidation?.actualHeaders?.length > 0 && (
                                    <div className='mt-3'>
                                        <div className="font-bold white-space-nowrap">Actual Headers:</div>
                                        <div className='flex mt-2'>
                                            {validationResult?.headerValidation?.actualHeaders.map((header: string, idx: number) => (
                                                <div key={idx} className={`px-2 py-1 flex-shrink-0 border border-right-1 border-top-1 border-bottom-1 border-gray-300 ${idx === 0 ? 'border-left-1' : ''}`}>
                                                    <span className="text-sm white-space-nowrap">{header}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )} */}

                                {validationResult?.headerValidation?.missingHeaders?.length > 0 && (
                                    <div className='mt-3'>
                                        <div className="font-bold white-space-nowrap">Missing Headers:</div>
                                        <div className='flex mt-2'>
                                            {validationResult?.headerValidation?.missingHeaders.map((header: string, idx: number) => (
                                                <div key={idx} className={`px-2 py-1 flex-shrink-0 border border-right-1 border-top-1 border-bottom-1 border-gray-300 ${idx === 0 ? 'border-left-1' : ''}`}>
                                                    <span className="text-sm white-space-nowrap">{header}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {validationResult?.headerValidation?.unexpectedHeaders?.length > 0 && (
                                    <div className='mt-3'>
                                        <div className="font-bold white-space-nowrap">Unexpected Headers:</div>
                                        <div className='flex mt-2'>
                                            {validationResult?.headerValidation?.unexpectedHeaders.map((header: string, idx: number) => (
                                                <div key={idx} className={`px-2 py-1 flex-shrink-0 border border-right-1 border-top-1 border-bottom-1 border-gray-300 ${idx === 0 ? 'border-left-1' : ''}`}>
                                                    <span className="text-sm white-space-nowrap">{header}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Only show non-conflict errors, or conflict errors with actual unique conflicts */}
                                {/* {validationResult.errors.filter(error =>
                                    !error.includes('hierarchy combinations') ||
                                    (validationResult.conflicts && validationResult.conflicts.some(c => getUniqueCombinations(c.combinations).length > 1))
                                ).length > 0 && (
                                        <>
                                            <Message severity="error" text="❌ Errors - Import cannot proceed" className="w-full mb-2" />
                                            {validationResult.errors.filter(error =>
                                                !error.includes('hierarchy combinations') ||
                                                (validationResult.conflicts && validationResult.conflicts.some(c => getUniqueCombinations(c.combinations).length > 1))
                                            ).map((error, idx) => (
                                                <div key={idx} className="p-2 bg-red-50 border-round mb-1">
                                                    <i className="pi pi-times-circle text-red-500 mr-2"></i>
                                                    <span className="text-sm">{error}</span>
                                                </div>
                                            ))}
                                        </>
                                    )} */}
                            </div>
                        )}

                        {validationResult?.canProceed && (
                            <div className='overflow-x-auto py-3'>
                                <div className="px-3 py-2 bg-green-50 border-round mb-1 flex align-items-center gap-1">
                                    <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                    <span className="text-green-500">{validationResult?.headerValidation?.note}</span>
                                </div>
                            </div>
                        )}

                        {/* Conflicts Section (STOP) - only show if there are actual unique conflicts */}
                        {/* {validationResult.conflicts && validationResult.conflicts.length > 0 && (
                            <div>
                                {validationResult.conflicts.filter(conflict => getUniqueCombinations(conflict.combinations).length > 1).length > 0 && (
                                    <>
                                        <Message
                                            severity="error"
                                            text={`❌ STOP: ${validationResult.conflicts.filter(c => getUniqueCombinations(c.combinations).length > 1).length} venue(s) with multiple hierarchy combinations`}
                                            className="w-full mb-2"
                                        />
                                        <div className="max-h-20rem overflow-auto">
                                            {validationResult.conflicts
                                                .filter(conflict => getUniqueCombinations(conflict.combinations).length > 1)
                                                .map((conflict, idx) => {
                                                    const uniqueCombos = getUniqueCombinations(conflict.combinations);
                                                    return (
                                                        <div key={idx} className="p-3 bg-red-50 border-round mb-2">
                                                            <div className="font-semibold text-red-700 mb-2">
                                                                📍 Venue: {conflict.venueName}
                                                            </div>
                                                            <div className="text-sm">
                                                                <strong>Multiple hierarchy combinations found:</strong>
                                                                {uniqueCombos.map((combo, cIdx) => (
                                                                    <div key={cIdx} className="ml-3 mt-1 p-2 bg-white border-round">
                                                                        <div><strong>Combination #{cIdx + 1}</strong></div>
                                                                        <div>• Leader: {combo.leader || 'N/A'}</div>
                                                                        <div>• Regional Head: {combo.regionalHead || 'N/A'}</div>
                                                                        <div>• Area Manager: {combo.areaManager || 'N/A'}</div>
                                                                        <div>• Venue Manager: {combo.venueManager || 'N/A'}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )} */}

                        {/* Warnings Section (WARNING) */}
                        {/* {validationResult.warnings && validationResult.warnings.length > 0 && (
                            <div>
                                <Message severity="warn" text="⚠️ Warnings" className="w-full mb-2" />
                                {validationResult.warnings.map((warning, idx) => (
                                    <div key={idx} className="p-2 bg-yellow-50 border-round mb-1">
                                        <i className="pi pi-exclamation-triangle text-yellow-600 mr-2"></i>
                                        <span className="text-sm">{warning}</span>
                                    </div>
                                ))}
                            </div>
                        )} */}

                        {/* New Venues Section (WARNING) */}
                        {validationResult.newVenuesCount > 0 && (
                            <div>
                                <Message
                                    severity="warn"
                                    text={`⚠️ WARNING: ${validationResult.newVenuesCount} new venue(s) will be created`}
                                    className="w-full mb-2"
                                />
                                <div className="max-h-15rem overflow-auto p-3 bg-yellow-50 border-round">
                                    <div className="font-semibold mb-2">New Venues:</div>
                                    {validationResult.newVenues.map((venue, idx) => (
                                        <div key={idx} className="text-sm py-1 pl-2">
                                            <i className="pi pi-plus-circle text-yellow-600 mr-2"></i>
                                            {venue}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* 
                                <div className="px-3 py-2 bg-red-50 border-round mb-1 flex align-items-center gap-1">
                                    <i className="pi pi-times-circle text-red-500 mr-2"></i>
                                    <span className="text-red-500">{validationResult?.headerValidation?.note}</span>
                                </div> */}

                        {validationResult.rowErrors && (
                            <div className="w-full">
                                <Message
                                    severity="error"
                                    text={`⚠️ ERROR: ${validationResult.rowErrors.length} row errors`}
                                    className="w-full mb-2"
                                />

                                <div className="p-2 bg-red-50 border-round border-1 border-red-200">
                                    {/* <div className="font-semibold mb-2">Invalid Dates:</div> */}

                                    <DataTable
                                        value={validationResult.rowErrors}
                                        size="small"
                                        stripedRows
                                        showGridlines
                                        scrollable
                                        scrollHeight="240px"     // vertical scroll
                                        className="p-datatable-sm"
                                        tableStyle={{ minWidth: "70rem" }} // forces horizontal scroll
                                        emptyMessage="No date errors"
                                    >
                                        <Column field="rowNumber" header="Row" style={{ width: "6rem", whiteSpace: "nowrap" }} />
                                        <Column field="field" header="Field" style={{ width: "8rem", whiteSpace: "nowrap" }} />
                                        <Column field="value" header="Value" style={{ minWidth: "22rem" }} />
                                        <Column field="message" header="Message" style={{ minWidth: "24rem" }} />
                                    </DataTable>

                                </div>
                            </div>
                        )}
                        {/* Success Message */}
                        {/* {(validationResult.canProceed ||
                            (validationResult.conflicts && validationResult.conflicts.every(c => getUniqueCombinations(c.combinations).length <= 1))) &&
                            validationResult.errors.filter(error => !error.includes('hierarchy combinations')).length === 0 && (
                                <Message
                                    severity="success"
                                    text="✅ Validation passed. You can proceed with the import."
                                    className="w-full"
                                />
                            )} */}

                        {/* Action Buttons */}
                        <div className="flex justify-content-end gap-2 pt-3 border-top-1 surface-border">
                            <Button
                                label="Cancel"
                                icon="pi pi-times"
                                onClick={() => dispatch(closePopup())}
                                severity="secondary"
                                outlined
                                size='small'
                            />
                            <Button
                                label="Continue Import"
                                icon="pi pi-check"
                                onClick={handleContinueImport}
                                disabled={!validationResult.canProceed || isTriggering}
                                loading={isTriggering}
                                severity="success"
                                size='small'
                            />
                        </div>

                        {/* Helper Text */}
                        {!validationResult.canProceed && (
                            <div className="text-center text-sm text-600 mt-2">
                                <i className="pi pi-info-circle mr-2"></i>
                                Please resolve the errors above before continuing with the import.
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    )
}
