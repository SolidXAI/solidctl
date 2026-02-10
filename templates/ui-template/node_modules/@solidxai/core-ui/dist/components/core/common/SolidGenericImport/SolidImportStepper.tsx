import { Button } from "primereact/button"
import { OverlayPanel } from "primereact/overlaypanel"
import { useEffect, useRef, useState } from "react"
import styles from './SolidImport.module.css'

export const SolidImportStepper = ({ importStep, setImportStep }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const leftOverlayRef = useRef<OverlayPanel>(null);
    const rightOverlayRef = useRef<OverlayPanel>(null);
    const [visibleStepsCount, setVisibleStepsCount] = useState(4);

    const allSteps = [
        { id: 1, label: "Instructions" },
        { id: 2, label: "Import" },
        { id: 3, label: "Map the fields" },
        { id: 4, label: "Summary" }
    ];

    const getStepColor = (step: number) => {
        if (importStep === step) return "var(--primary-color)";      // current step
        if (importStep > step) return "#eceff1";        // past step
        return "#F9F9F9";                                  // future step
    };

    // Dynamic responsive logic - same as SolidFormStepper
    useEffect(() => {
        const calculateVisibleSteps = () => {
            if (!containerRef.current) return;
            
            const containerWidth = containerRef.current.offsetWidth;
            const overflowButtonWidth = 50;
            const stepWidth = 150; // approximate width per step
            const arrowOverlap = 14; // overlap between steps
            
            // Calculate how many steps can fit
            let count = 0;
            let totalWidth = 0;

            for (let i = 0; i < allSteps.length; i++) {
                const stepSpace = i === 0 ? stepWidth : stepWidth - arrowOverlap;
                const needsOverflow = (i < allSteps.length - 1 && count + 1 < allSteps.length);
                const requiredWidth = totalWidth + stepSpace + (needsOverflow ? overflowButtonWidth : 0);
                
                if (requiredWidth <= containerWidth) {
                    totalWidth += stepSpace;
                    count++;
                } else {
                    break;
                }
            }

            count = Math.max(1, count); // At least 1 step visible
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
    }, []);

    const activeIndex = importStep - 1;
    const isSingleVisibleStep = visibleStepsCount === 1;

    let visibleSteps: any[] = [];
    let previousSteps: any[] = [];
    let nextSteps: any[] = [];

    if (isSingleVisibleStep) {
        // Show only current step
        visibleSteps = [allSteps[activeIndex]];
        previousSteps = allSteps.slice(0, activeIndex);
        nextSteps = allSteps.slice(activeIndex + 1);
    } else if (activeIndex < visibleStepsCount) {
        // Active step is in first group
        visibleSteps = allSteps.slice(0, visibleStepsCount);
        nextSteps = allSteps.slice(visibleStepsCount);
    } else {
        // Active step needs to be centered
        const slotsAvailable = visibleStepsCount - 1;
        const afterActive = Math.min(Math.floor(slotsAvailable / 2), allSteps.length - activeIndex - 1);
        const beforeActive = slotsAvailable - afterActive;

        const startIndex = Math.max(0, activeIndex - beforeActive);
        const endIndex = Math.min(allSteps.length, activeIndex + afterActive + 1);

        previousSteps = allSteps.slice(0, startIndex);
        visibleSteps = allSteps.slice(startIndex, endIndex);
        nextSteps = allSteps.slice(endIndex);
    }

    const hasPreviousSteps = previousSteps.length > 0 && !isSingleVisibleStep;
    const hasNextSteps = nextSteps.length > 0 || (isSingleVisibleStep && previousSteps.length > 0);

    const renderStepSVG = (step: any, index: number) => {
        const isFirst = index === 0 && !hasPreviousSteps;
        const isLast = index === visibleSteps.length - 1 && !hasNextSteps;
        const marginLeft = index === 0 ? 0 : -14;

        if (isFirst) {
            // First step - arrow on right only
            return (
                <div className="flex relative" style={{ flex: 1, height: 40, zIndex: 4 - index, marginLeft }} onClick={() => setImportStep(step.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 343 40" fill="none" preserveAspectRatio="none">
                        <path d="M342 20.1399L329 0H0V40H329L342 20.1399Z" fill={getStepColor(step.id)} stroke={getStepColor(step.id)} strokeLinejoin="round" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="100%" viewBox="0 0 10 40" fill="none" style={{ marginLeft: -12 }}>
                        <path d="M1 0L10 20.1399L1 40" stroke="#CFD6DC" strokeLinejoin="round" />
                    </svg>
                    <div className={`${styles.StepperText} ${importStep === step.id ? styles.ActiveStepperText : styles.DeactiveStepperText}`}>{step.label}</div>
                </div>
            );
        } else if (isLast) {
            // Last step - arrow on left only
            return (
                <div className="flex relative" style={{ flex: 1, height: 40, zIndex: 4 - index, marginLeft: -22 }} onClick={() => setImportStep(step.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 330 40" fill="none" preserveAspectRatio="none">
                        <path d="M330 0H0L13.5 20L0 40H330V0Z" fill={getStepColor(step.id)} stroke={getStepColor(step.id)} strokeLinejoin="round" />
                    </svg>
                    <div className={`${styles.StepperText} ${importStep === step.id ? styles.ActiveStepperText : styles.DeactiveStepperText}`}>{step.label}</div>
                </div>
            );
        } else {
            // Middle steps - arrows on both sides
            return (
                <div className="flex relative" style={{ flex: 1, height: 40, zIndex: 4 - index, marginLeft: -22 }} onClick={() => setImportStep(step.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 343 40" fill="none" preserveAspectRatio="none">
                        <path d="M342 20.1399L330 0H0L13.5 20L0 40H330L342 20.1399Z" fill={getStepColor(step.id)} stroke={getStepColor(step.id)} strokeLinejoin="round" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="100%" viewBox="0 0 10 40" fill="none" style={{ marginLeft: -13 }}>
                        <path d="M1 0L10 20.1399L1 40" stroke="#CFD6DC" strokeLinejoin="round" />
                    </svg>
                    <div className={`${styles.StepperText} ${importStep === step.id ? styles.ActiveStepperText : styles.DeactiveStepperText}`}>{step.label}</div>
                </div>
            );
        }
    };

    return (
        <div className="py-2 px-3 px-md-4 secondary-border-bottom" style={{ backgroundColor: '#F6F6F6' }}>
            <div ref={containerRef} className="flex align-items-center" style={{ borderRadius: 6, border: '1px solid var(--primary-light-color)', overflow: 'hidden', cursor: 'pointer' }}>
                
                {/* Left Overflow Button */}
                {hasPreviousSteps && (
                    <>
                        <Button
                            icon="pi pi-chevron-left"
                            text
                            rounded
                            size="small"
                            style={{ minWidth: '40px', height: '40px', margin: '0 4px' }}
                            onClick={(e) => leftOverlayRef.current?.toggle(e)}
                        />
                        <OverlayPanel ref={leftOverlayRef}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
                                {previousSteps.map((step) => (
                                    <Button
                                        key={step.id}
                                        label={step.label}
                                        text
                                        className={importStep === step.id ? 'p-button-primary' : ''}
                                        onClick={() => {
                                            setImportStep(step.id);
                                            leftOverlayRef.current?.hide();
                                        }}
                                    />
                                ))}
                            </div>
                        </OverlayPanel>
                    </>
                )}

                {/* Visible Steps */}
                {visibleSteps.map((step, index) => renderStepSVG(step, index))}

                {/* Right Overflow Button */}
                {hasNextSteps && (
                    <>
                        <Button
                            icon="pi pi-chevron-right"
                            text
                            rounded
                            size="small"
                            style={{ minWidth: '40px', height: '40px' }}
                            onClick={(e) => rightOverlayRef.current?.toggle(e)}
                        />
                        <OverlayPanel ref={rightOverlayRef}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
                                {(isSingleVisibleStep ? [...previousSteps, ...nextSteps] : nextSteps).map((step) => (
                                    <Button
                                        key={step.id}
                                        label={step.label}
                                        text
                                        className={importStep === step.id ? 'p-button-primary' : ''}
                                        onClick={() => {
                                            setImportStep(step.id);
                                            rightOverlayRef.current?.hide();
                                        }}
                                    />
                                ))}
                            </div>
                        </OverlayPanel>
                    </>
                )}
            </div>
        </div>
    )
}