
import { ERROR_MESSAGES } from '../constants/error-messages';
import { FetchBaseQueryError } from '@reduxjs/toolkit/dist/query';
import { Toast } from 'primereact/toast';
import React, { useRef } from 'react';


interface ErrorResponseData {
    message: string;
    statusCode: number;
    error: string;
}


let toastRef: React.MutableRefObject<Toast | null> | null = null;

export const ToastContainer = () => {
    toastRef = useRef(null);

    return <Toast ref={toastRef} />;
};

function isFetchBaseQueryErrorWithErrorResponse(error: any): error is FetchBaseQueryError & { data: ErrorResponseData } {
    return error && typeof error === 'object' && 'data' in error && 'message' in error.data;
}
const extractErrorMessages = (errorObj: Record<string, string>): string[] => {
    return Object.values(errorObj);
};


export const handleError = (errorToast: any) => {
    let errorMessage: any = errorToast ? errorToast : [ERROR_MESSAGES.ERROR_OCCURED];


    if (typeof errorMessage == 'object') {
        if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
            errorMessage = errorToast.data.message;
        }
    }
    // if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
    //     errorMessage = errorToast.data.message;
    // } else {
    //     errorMessage = ['Something went wrong'];
    // }

    toastRef?.current?.show({
        severity: 'error',
        summary: ERROR_MESSAGES.ERROR,
        detail: errorMessage,
        life: 3000,
        //@ts-ignore
        content: (props) => (
            <div className="flex flex-column align-items-left" style={{ flex: "1" }}>
                {Array.isArray(errorMessage) ? (
                    errorMessage.map((message, index) => (
                        <div className="flex align-items-center gap-2" key={index}>
                            <span className="font-bold text-900">{message.trim()}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex align-items-center gap-2">
                        <span className="font-bold text-900">{errorMessage?.trim()}</span>
                    </div>
                )}
            </div>
        ),
    });
};

export const handleSuccess = (successMessage: any) => {

    toastRef?.current?.show({
        severity: 'error',
        summary: ERROR_MESSAGES.IS_SUCCESS,
        detail: successMessage,
        life: 3000,
        //@ts-ignore
        content: (props) => (
            <div className="flex flex-column align-items-left" style={{ flex: "1" }}>
                {Array.isArray(successMessage) ? (
                    successMessage.map((message, index) => (
                        <div className="flex align-items-center gap-2" key={index}>
                            <span className="font-bold text-900">{message.trim()}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex align-items-center gap-2">
                        <span className="font-bold text-900">{successMessage?.trim()}</span>
                    </div>
                )}
            </div>
        ),
    });
};
