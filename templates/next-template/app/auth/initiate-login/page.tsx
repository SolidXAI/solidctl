"use client"
import { SolidInitialLoginOtp } from "@solidx/solid-core-ui";
import { useSearchParams } from "next/navigation";

const InitiateLoginConfirm = () => {
    return (
        <div>
            <SolidInitialLoginOtp />
        </div>
    );
};

export default InitiateLoginConfirm;