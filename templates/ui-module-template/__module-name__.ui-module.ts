import {
    ExtensionComponentTypes,
    ExtensionFunctionTypes,
    type SolidUiModule,
} from "@solidxai/core-ui";

// Import extension components and functions per model, e.g.:
// import ExampleWidget from "./admin-layout/{model-name}/extension-components/ExampleWidget";
// import exampleChangeHandler from "./admin-layout/{model-name}/extension-functions/exampleChangeHandler";

// Import Redux API slices, e.g.:
// import { exampleApi } from "./redux/exampleApi";

// This file is auto-discovered by solid-ui-modules.ts via import.meta.glob.
const moduleUiModule = {
    name: "__module-name__",
    extensionComponents: [
        // { name: "ExampleWidget", component: ExampleWidget, type: ExtensionComponentTypes.formWidget },
    ],
    extensionFunctions: [
        // { name: "exampleChangeHandler", fn: exampleChangeHandler, type: ExtensionFunctionTypes.onFieldChange },
    ],
    reducers: {
        // [exampleApi.reducerPath]: exampleApi.reducer,
    },
    middlewares: [
        // exampleApi.middleware,
    ],
} satisfies SolidUiModule;

export default moduleUiModule;
