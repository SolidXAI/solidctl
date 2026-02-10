
import { useGetmodelByIdQuery } from "../../../redux/api/modelApi";
import { useGetmoduleByIdQuery } from "../../../redux/api/moduleApi";
import { useGetusersByIdQuery } from "../../../redux/api/userApi";
import { useEffect } from "react";
import CreateModel from "../model/CreateModel";
import CreateModule from "../module/CreateModule";
import CreateUser from "../users/CreateUser";
import SolidFormView from "./SolidFormView";
import { camelCase } from "change-case";

type SolidViewParams = {
    params: {
        moduleName: string;
        modelName: string;
        id: string;
    };
};

const SolidFormLayouts = ({ params }: any) => {
    const {
        data: modelData,
        error,
        isLoading,
        isError,
        refetch
    } = useGetmodelByIdQuery(params.id, {
        skip: params.id === 'new' || params.modelName !== 'model-metadata',
    });
    useEffect(() => {
        if (params?.id !== 'new' && params.modelName === 'model-metadata') {
            refetch();
        }
    }, [params.id, refetch]);

    const {
        data: moduleData,
        error: moduleError,
        isLoading: isModuleLoading,
        isError: isModuleError,
        refetch: refetchModule
    } = useGetmoduleByIdQuery(params.id, {
        skip: params.id === 'new' || params.modelName !== 'module-metadata',
    });
    useEffect(() => {
        if (params?.id !== 'new' && params.modelName === 'module-metadata') {
            refetchModule();
        }
    }, [refetchModule]);

    const {
        data: userData,
        error: usererror,
        isLoading: isuserLoading,
        isError: isuserError,
        refetch: refetchuser
    } = useGetusersByIdQuery(params.id, {
        skip: params.id === 'new' || params.modelName !== 'user',
    });
    useEffect(() => {
        if (params?.id !== 'new' && params?.modelName === 'user') {
            refetchuser();
        }
    }, [refetchuser]);

    return (
        <div className="page-parent-wrapper">
            {params.modelName === "model-metadata" &&
                // <SolidFormView {...params} embeded={false} modelName={camelCase(params.modelName)} />
                (params.id === "new" ?
                    <CreateModel params={params}></CreateModel>
                    :
                    <CreateModel params={params} data={modelData?.data}></CreateModel>
                )
            }
            {params.modelName === "module-metadata" &&
                // <SolidFormView {...params} embeded={false} modelName={camelCase(params.modelName)} />
                (params.id === "new" ?
                    <CreateModule params={params}></CreateModule>
                    :
                    <CreateModule params={params} data={moduleData?.data}></CreateModule>
                )
            }

            {params.modelName === "user" &&
                // <SolidFormView {...params} embeded={false} modelName={camelCase(params.modelName)} />
                (params.id === "new" ?
                    <CreateUser params={params}></CreateUser>
                    :
                    <CreateUser params={params} data={userData?.data}></CreateUser>
                )
            }

            {params.modelName === "field-metadata" &&
                <SolidFormView {...params} embeded={false} modelName={camelCase(params.modelName)} />
            }
            {params.modelName !== "field-metadata" && params.modelName !== "model-metadata" && params.modelName !== "module-metadata" && params.modelName !== "user" &&
                <SolidFormView {...params} embeded={false} modelName={camelCase(params.modelName)} />
            }
        </div>
    )
}

export default SolidFormLayouts