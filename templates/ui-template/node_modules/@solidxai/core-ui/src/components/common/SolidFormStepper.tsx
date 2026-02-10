import { OverlayPanel } from 'primereact/overlaypanel';
import { useEffect, useRef, useState } from 'react'
import { createSolidEntityApi } from '../../redux/api/solidEntityApi';
import { useFormik } from 'formik';
import { Toast } from 'primereact/toast';
import { useSearchParams } from "../../hooks/useSearchParams";
import { ERROR_MESSAGES } from '../../constants/error-messages';
import showToast from "../../helpers/showToast";

interface Props {
    solidFormViewMetaData?: any;
    modelName?: any,
    initialEntityData?: any;
    id?: any,
    solidWorkflowFieldValue?: any
    setSolidWorkflowFieldValue?: any
    onStepperUpdate?: () => void
}

export const SolidFormStepper = (props: Props) => {
    const { solidFormViewMetaData, modelName, initialEntityData, id, solidWorkflowFieldValue, setSolidWorkflowFieldValue, onStepperUpdate } = props;
    const toast = useRef<Toast>(null);
    const formStepperOverlay = useRef(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const leftFormStepperOverlay = useRef(null);

    const searchParams = useSearchParams();
    const viewMode = searchParams.get('viewMode');

    const solidFormViewWorkflowData = solidFormViewMetaData?.data?.solidFormViewWorkflowData;
    const solidWorkflowField = solidFormViewMetaData?.data?.solidView?.layout?.attrs?.workflowField;
    const solidWorkflowFieldEnabled = solidFormViewMetaData?.data?.solidView?.layout?.attrs?.workflowFieldUpdateEnabled;
    const defaultWorkflowFieldValue = solidFormViewMetaData?.data?.solidFieldsMetadata?.[solidWorkflowField]?.defaultValue
    const defaultWorkflowFieldDisplayName = solidFormViewMetaData?.data?.solidFieldsMetadata?.[solidWorkflowField]?.displayName
    const activeStep = solidFormViewMetaData?.data?.solidFormViewWorkflowData[0].value
    const [solidWorkflowFieldKey, setSolidWorkflowFieldKey] = useState<string>("");
    const [visibleStepsCount, setVisibleStepsCount] = useState<number>(1);

    // Dynamic responsive logic
    useEffect(() => {
        const calculateVisibleSteps = () => {
            if (!containerRef.current || !solidFormViewWorkflowData || solidFormViewWorkflowData.length === 0) return;

            const containerWidth = containerRef.current.offsetWidth;
            const overflowButtonWidth = 50;
            const arrowWidth = 30; // Width for arrow between buttons
            const spacing = 0; // No gap needed as arrows connect buttons

            const tempContainer = document.createElement('div');
            tempContainer.style.visibility = 'hidden';
            tempContainer.style.position = 'absolute';
            document.body.appendChild(tempContainer);

            const buttonWidths: number[] = [];

            solidFormViewWorkflowData.forEach((step: any) => {
                const tempButton = document.createElement('button');
                tempButton.className = 'arrow-step-button';
                tempButton.textContent = step.label;
                tempButton.style.padding = '0.5rem 1.5rem';
                tempButton.style.minWidth = '100px';
                tempContainer.appendChild(tempButton);
                buttonWidths.push(Math.max(100, tempButton.offsetWidth));
            });

            document.body.removeChild(tempContainer);

            let count = 0;
            let totalWidth = 0;

            for (let i = 0; i < buttonWidths.length; i++) {
                const buttonWidth = buttonWidths[i];
                const arrowSpace = i > 0 ? arrowWidth : 0;
                const needsOverflow = i < buttonWidths.length - 1;
                const requiredWidth = totalWidth + buttonWidth + arrowSpace + (needsOverflow ? overflowButtonWidth : 0);

                if (requiredWidth <= containerWidth) {
                    totalWidth += buttonWidth + arrowSpace;
                    count++;
                } else {
                    break;
                }
            }

            count = Math.max(1, count);
            setVisibleStepsCount(count);
        };

        calculateVisibleSteps();

        const resizeObserver = new ResizeObserver(calculateVisibleSteps);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        const timeoutId = setTimeout(calculateVisibleSteps, 100);

        return () => {
            resizeObserver.disconnect();
            clearTimeout(timeoutId);
        };
    }, [solidFormViewWorkflowData]);

    useEffect(() => {
        if (!solidWorkflowField) return;

        setSolidWorkflowFieldKey(solidWorkflowField);

        setSolidWorkflowFieldValue(() => {
            if (initialEntityData?.[solidWorkflowField] !== undefined) {
                if (solidFormViewMetaData?.data?.solidFieldsMetadata?.[solidWorkflowField]?.type === "relation") {
                    return initialEntityData[solidWorkflowField]?.id || initialEntityData[solidWorkflowField];
                } else {
                    return initialEntityData[solidWorkflowField];
                }
            } else if (defaultWorkflowFieldValue !== undefined) {
                return defaultWorkflowFieldValue;
            } else {
                return activeStep;
            }
        });
    }, [solidWorkflowField, initialEntityData, defaultWorkflowFieldValue, activeStep]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: +id,
            [solidWorkflowFieldKey]: solidWorkflowFieldValue || "",
        },
        onSubmit: (values) => {
            handleStepChange(values);
        }
    });

    const entityApi = createSolidEntityApi(modelName);
    const { usePatchUpdateSolidEntityMutation } = entityApi;

    const [
        updateStepper,
        { isSuccess: isStepperUpdateSuccessfull, isError: isStepperUpdateError, error: stepperUpdateError },
    ] = usePatchUpdateSolidEntityMutation();

    const handleStepChange = async (values: any) => {
        try {
            const result = await updateStepper({ id: values.id, data: { [solidWorkflowFieldKey]: values[solidWorkflowFieldKey] } }).unwrap();
            if (result?.statusCode === 200) {
                showToast(toast, "success", ERROR_MESSAGES.FIELD_UPDATE(defaultWorkflowFieldDisplayName), ERROR_MESSAGES.FIELD_UPDATE_SUCCESSFULLY(defaultWorkflowFieldDisplayName));
                if (result?.data?.[solidWorkflowFieldKey]) {
                    setSolidWorkflowFieldValue(result.data[solidWorkflowFieldKey]);
                }
                if (onStepperUpdate) {
                    onStepperUpdate();
                }
            }
        } catch (error) {
            console.error(ERROR_MESSAGES.UPDATING_STEPPER, error);
            showToast(toast, "error", ERROR_MESSAGES.UPDATE_FAILED, ERROR_MESSAGES.FAILED_UPDATE_FROM);
        }
    }

    const handleButtonClick = (stepValue: any) => {
        if (solidWorkflowFieldEnabled === false || id === "new" || viewMode === "view") {
            return
        } else {
            formik.setFieldValue(solidWorkflowFieldKey, stepValue);
            formik.handleSubmit();
        }
    }

    const activeIndex = solidFormViewWorkflowData?.findIndex((step: any) => step.value === solidWorkflowFieldValue) ?? -1;

    let visibleSteps: any[] = [];
    let previousSteps: any[] = [];
    let nextSteps: any[] = [];
    const isSingleVisibleStep = visibleStepsCount === 1;

    if (solidFormViewWorkflowData && solidFormViewWorkflowData.length > 0) {
        if (activeIndex === -1) {
            visibleSteps = solidFormViewWorkflowData.slice(0, visibleStepsCount);
            nextSteps = solidFormViewWorkflowData.slice(visibleStepsCount);
        } else if (visibleStepsCount === 1) {
            visibleSteps = [solidFormViewWorkflowData[activeIndex]];
            previousSteps = solidFormViewWorkflowData.slice(0, activeIndex);
            nextSteps = solidFormViewWorkflowData.slice(activeIndex + 1);
        } else {
            const totalSteps = solidFormViewWorkflowData.length;

            if (activeIndex < visibleStepsCount) {
                visibleSteps = solidFormViewWorkflowData.slice(0, visibleStepsCount);
                nextSteps = solidFormViewWorkflowData.slice(visibleStepsCount);
            } else {
                const slotsAvailable = visibleStepsCount - 1;
                const afterActive = Math.min(Math.floor(slotsAvailable / 2), totalSteps - activeIndex - 1);
                const beforeActive = slotsAvailable - afterActive;

                const startIndex = Math.max(0, activeIndex - beforeActive);
                const endIndex = Math.min(totalSteps, activeIndex + afterActive + 1);

                previousSteps = solidFormViewWorkflowData.slice(0, startIndex);
                visibleSteps = solidFormViewWorkflowData.slice(startIndex, endIndex);
                nextSteps = solidFormViewWorkflowData.slice(endIndex);
            }
        }
    }

    const hasPreviousSteps =
        previousSteps.length > 0 && !isSingleVisibleStep;

    const hasNextSteps =
        nextSteps.length > 0 || (isSingleVisibleStep && previousSteps.length > 0);

    return (
        <>
            <Toast ref={toast} />
            <div ref={containerRef} className='arrow-stepper-container'>
                {hasPreviousSteps && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            type='button'
                            className="overflow-button overlow-left-button"
                            onClick={(e) => {
                                // @ts-ignore
                                leftFormStepperOverlay.current.toggle(e)
                            }}
                        >
                            <i className="pi pi-ellipsis-h" />
                        </button>
                        <OverlayPanel
                            ref={leftFormStepperOverlay}
                            className="solid-custom-overlay solid-form-stepper-overlay"
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}>
                                {previousSteps.map((step: any, index: number) => {
                                    const stepIndex = index;
                                    const isStepActive = stepIndex === activeIndex;
                                    const isStepBeforeActive = stepIndex < activeIndex;

                                    return (
                                        <button
                                            key={stepIndex}
                                            type='button'
                                            className={`overlay-step-button ${isStepActive ? 'active' : ''} ${isStepBeforeActive ? 'completed' : ''}`}
                                            onClick={() => {
                                                handleButtonClick(step.value);
                                                // @ts-ignore
                                                leftFormStepperOverlay.current.hide();
                                            }}
                                        >
                                            {step.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </OverlayPanel>
                    </div>
                )}

                {visibleSteps.map((step: any) => {
                    const stepIndex = solidFormViewWorkflowData.findIndex(
                        (s: any) => s.value === step.value
                    );

                    const isActive = stepIndex === activeIndex;
                    const isBeforeActive = stepIndex < activeIndex;
                    const isSingleButton = visibleSteps.length === 1;

                    return (
                        <button
                            key={step.value}
                            type="button"
                            className={`arrow-step-button ${isSingleButton ? 'single-button' : ''
                                } ${isActive
                                    ? 'arrow-step-active'
                                    : isBeforeActive
                                        ? 'arrow-step-completed'
                                        : 'arrow-step-future'
                                }`}
                            onClick={() => handleButtonClick(step.value)}
                            title={step.label}
                        >
                            <span className="step-text">{step.label}</span>
                        </button>
                    );
                })}

                {hasNextSteps && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            type='button'
                            className="overflow-button overflow-right-button"
                            onClick={(e) => {
                                // @ts-ignore
                                formStepperOverlay.current.toggle(e)
                            }}
                        >
                            <i className="pi pi-ellipsis-h" />
                        </button>
                        <OverlayPanel
                            ref={formStepperOverlay}
                            className="solid-custom-overlay solid-form-stepper-overlay"
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}>
                                {(isSingleVisibleStep
                                    ? [...previousSteps, ...nextSteps]
                                    : nextSteps).map((step: any) => {

                                        const stepIndex = solidFormViewWorkflowData.findIndex(
                                            (s: any) => s.value === step.value
                                        );

                                        const isStepActive = stepIndex === activeIndex;
                                        const isStepBeforeActive = stepIndex < activeIndex;

                                        return (
                                            <button
                                                key={stepIndex}
                                                type='button'
                                                className={`overlay-step-button ${isStepActive ? 'active' : ''} ${isStepBeforeActive ? 'completed' : ''}`}
                                                onClick={() => {
                                                    handleButtonClick(step.value);
                                                    // @ts-ignore
                                                    formStepperOverlay.current.hide();
                                                }}
                                            >
                                                {step.label}
                                            </button>
                                        )
                                    })}
                            </div>
                        </OverlayPanel>
                    </div>
                )}
            </div>
        </>
    )
}
