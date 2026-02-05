"use client"
import { SolidInitiateRegisterOtp } from "@solidxai/core-ui";

import { useSearchParams } from "next/navigation";

const InitiateRegisterConfirm = () => {
    return (
        <div>
            <SolidInitiateRegisterOtp />
        </div>
    );
};

export default InitiateRegisterConfirm;