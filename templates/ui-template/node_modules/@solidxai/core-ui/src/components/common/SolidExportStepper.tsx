
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import React, { useRef, useState } from "react";

interface Step {
  label: string;
  value: string;
}

interface Props {
  solidFormViewWorkflowData: Step[];
  activeValue: string;
  setActiveValue: (value: string) => void;
}

export const SolidExportStepper = ({ solidFormViewWorkflowData, activeValue ,setActiveValue}: Props) => {
  const formStepperOverlay = useRef<OverlayPanel>(null);
  const activeIndex = solidFormViewWorkflowData.findIndex(step => step.value === activeValue);
  const visibleSteps = solidFormViewWorkflowData.length > 5
    ? solidFormViewWorkflowData.slice(0, 5)
    : solidFormViewWorkflowData;
    const handleStepClick = (value: string) => {
        setActiveValue(value);
      };
  return (
    <div className="flex solid-dynamic-stepper export-stepper">
      {visibleSteps.map((step: any, index: number) => {
                         const isActive = index === activeIndex;
                         const isBeforeActive = index < activeIndex;
                         const isAfterActive = index > activeIndex;
                         const isFirstVisible = index === 0;
                         const isLastVisible = index === visibleSteps.length - 1;
                         const isNextAfterActive = index === activeIndex + 1;
                         const isTwoStepsOnly = visibleSteps.length === 2;
                         return (
                             <Button
                             key={index}
                             type="button"
                             className={`solid-step-button export relative ${isTwoStepsOnly ? 'two-step-button' : ''} ${isActive ? 'p-button-primary' : ''} ${isBeforeActive ? 'p-button-secondary' : ''}`}
                             text={!isActive && !isBeforeActive}
                                 onClick={() => handleStepClick(step.value)}
                             >
                                 {step.label}
                                 <>
                                     {isNextAfterActive && solidFormViewWorkflowData.map((step: any) => step.value).includes(activeValue) &&
                                         (
                                             <div className="absolute active-step-arrow">
                                                 <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" fill="#000000" transform="rotate(30)"
                                                     height="60px"
                                                     width="60px"
                                                 >
                                                     <g id="SVGRepo_iconCarrier">
                                                         <g id="color">
                                                             <polygon fill={"var(--primary-color)"} points="36,62 65,12 7,12" />
                                                         </g>
                                                         <g id="line">
                                                             <polyline fill="none" stroke="" strokeMiterlimit="10" strokeWidth="1.5" points="36,62 65,12 7,12" />
                                                         </g>
                                                     </g>
                                                 </svg>
                                             </div>
                                         )}
     
                                     {(isActive || isBeforeActive) && !isFirstVisible && (!isTwoStepsOnly || index === 1) && (
                                         <div className="absolute active-before-step-arrow">
                                             <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" fill="#000000" transform="rotate(30)"
                                                 height="55px"
                                                 width="55px"
                                             >
                                                 <g id="SVGRepo_iconCarrier">
                                                     <g id="color">
                                                         <polygon fill="#EAEDF1" points="36,62 65,12 7,12" />
                                                     </g>
                                                     <g id="line">
                                                         <polyline fill="none" stroke="var(--solid-stepper-border)" strokeMiterlimit="10" strokeWidth="1.5" points="36,62 65,12 7,12" />
                                                     </g>
                                                 </g>
                                             </svg>
                                         </div>
                                     )}
     
                                     {isAfterActive && !isLastVisible && (
                                         <div className="absolute inactive-step-arrow">
                                             <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" fill="#000000" transform="rotate(30)"
                                                 height="55px"
                                                 width="55px"
                                             >
                                                 <g id="SVGRepo_iconCarrier">
                                                     <g id="color">
                                                         <polygon fill="#EAEDF1" points="36,62 65,12 7,12" />
                                                     </g>
                                                     <g id="line">
                                                         <polyline fill="none" stroke="var(--solid-stepper-border)" strokeMiterlimit="10" strokeWidth="1.5" points="36,62 65,12 7,12" />
                                                     </g>
                                                 </g>
                                             </svg>
                                         </div>
                                     )}
                                 </>
                                 {solidFormViewWorkflowData.length > 5 && index === 4 && (
                                     <div className='absolute' style={{ right: 5 }}>
                                         <Button
                                             type='button'
                                             icon="pi pi-angle-down"
                                             text
                                             size='small'
                                             style={{ height: 24, width: '1.5rem', padding: 0 }}
                                             onClick={(e) =>
                                                 // @ts-ignore 
                                                 formStepperOverlay.current.toggle(e)
                                             }
                                         />
                                         <OverlayPanel ref={formStepperOverlay} className="solid-custom-overlay solid-form-stepper-overlay">
                                             <div className='flex flex-column gap-1 p-1'>
                                                 {solidFormViewWorkflowData.slice(5).map((step: any, index: number) => (
                                                     <Button
                                                         key={index}
                                                         type='button'
                                                         label={step.label}
                                                         size='small'
                                                         text
                                                         onClick={() => handleStepClick(step.value)}
                                                     />
                                                 ))}
                                             </div>
                                         </OverlayPanel>
                                     </div>
                                 )}
                             </Button>
                         )
                     })}
    </div>
  );
};
