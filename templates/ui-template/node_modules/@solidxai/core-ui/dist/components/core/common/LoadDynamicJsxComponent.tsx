'use client';
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
// Fallback component for missing components
const FallbackComponent = ({ componentName }: any) => (
    <div style={{ color: "red" }}>
        Could not load <strong>{componentName}</strong>
    </div>
);

type Props = {
    context: any;
};

export const LoadDynamicJsxComponent = ({ context }: any) => {

    
    // const Component = dynamic<Props>(
    //     async () => {
    //         try {
               
    //             const componentName = context?.rowAction?.action?.customComponent.split('/').pop();
    //             const mod = await import();
    //             // Return the default export or a named export matching the componentName
    //             return mod.default || mod[componentName];
    //         } catch (error) {
    //             console.error(`Failed to load component "${context?.rowAction?.action?.customComponent}":`, error);
    //             // Return a fallback component if the import fails
    //             return () => <GenerateModelCodeRowAction context={context} />;
    //         }
    //     },
    //     { ssr: false } // Disable server-side rendering
    // );
    const [Component, setComponent] = useState<any>(null);
    const componentPath = context?.rowAction?.action?.customComponent;
    const componentKey = componentPath?.split("/")?.pop();

    const componentMap: Record<string, any> = {
        "GenerateModelCodeRowAction": dynamic(
          () => import("../extension/solid-core/modelMetadata/list/GenerateModelCodeRowAction"),
          { ssr: false }
        ),
        "GenerateModuleCodeRowAction": dynamic(
            () => import("../extension/solid-core/moduleMetadata/list/GenerateModuleCodeRowAction"),
            { ssr: false }
        ),
    };

    useEffect(() => {
        if (!componentKey) return;

        if (componentMap[componentKey]) {
            setComponent(() => () => setComponent(() => componentMap[componentKey]));
        } else {
        import(componentPath)
            .then((mod) => setComponent(() => mod.default || mod))
            .catch((err) => {
            console.error(` ${ERROR_MESSAGES.LOADING_COMPONENT} ${componentPath}:`, err);
            setComponent(() => () => <FallbackComponent componentName={componentKey} />);
            });
        }
    }, [componentKey]);

    if (!Component) return <p>Loading...</p>;

    return <Component context={context} />;
}


