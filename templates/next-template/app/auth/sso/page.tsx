"use client";

import { getSession, signIn } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";

type Params = {
    params: {
        accessToken: string;
    };
};
export default function page() {
    const router = useRouter();
    const [error, setError] = useState<any>();
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);


    const searchParams = useSearchParams()


    const fn = async () => {
        const email = "";
        const password = "";
        const accessToken = searchParams.get('accessToken')
        const response = await signIn("credentials", {
            redirect: false,
            email,
            password,
            accessToken
        });
        if (response?.error) {
            setIsLoading(false);
            setError(response.error);
        } else {
            setIsLoading(false);
            setSuccess(true);
            router.push("/admin/dashboard");
        }
    }
    useEffect(() => {
        fn()
    }, [])

    return (
        <div className="card flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <Card className="custom-card md:w-25rem" style={{
                boxShadow: 'rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px'
            }}>
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 1,
                        // marginBottom: '50px'
                    }}>
                        {isLoading 
                        ? <>
                            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                        <style>{`
                        .p-progress-spinner circle {
                            stroke: blue !important; /* Make the spinner blue */
                        }
                    `   }</style>
                        </> 
                        : success 
                        ? <i className="pi pi-check" style={{color: 'green', fontSize: '30px', fontWeight: '700'}}></i> 
                        : <i className="pi pi-times" style={{color: 'red', fontSize: '30px', fontWeight: '700'}}></i>}
                    </div>
                <p className="m-20" style={{textAlign: 'center'}}>
                    {isLoading && `Please wait while we authenticate your profile.`}
                    {error && `${error} Your not authenticated`}
                </p>
            </Card>
        </div>
    );
};

