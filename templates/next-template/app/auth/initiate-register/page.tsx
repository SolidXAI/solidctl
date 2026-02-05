"use client"
import { SolidInitiateRegisterOtp } from "@solidx/solid-core-ui";

import { useSearchParams } from "next/navigation";

const InitiateRegisterConfirm = () => {
    return (
        <div>
            <SolidInitiateRegisterOtp />
        </div>
    );
};

export default InitiateRegisterConfirm;