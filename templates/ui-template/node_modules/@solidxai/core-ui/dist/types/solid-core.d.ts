import { Session } from "../adapters/auth";

// Base type of all Solid entities
export type CommonEntity = {
    id: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletedTracker: string;
};

// Model
export type ModelMetadata = CommonEntity & {
    singularName: string;
    tableName: string;
    pluralName: string;
    displayName: string;
    description: string;
    dataSource: string;
    dataSourceType: string;
    enableSoftDelete: boolean;
    enableAuditTracking: boolean;
    internationalisation: boolean;
    isSystem: boolean;
    userKeyField: string | null;
};

// Module 
export type ModuleMetadata = CommonEntity & {
    displayName: string;
    name: string;
    description: string;
    menuIconUrl: string | null;
    menuSequenceNumber: number;
    defaultDataSource: string;
    isSystem: boolean;
};

// Define a general Field type with id and name as required properties
export type FieldMetadata = CommonEntity & {
    id: number;
    name: string;
    displayName: string;

    // For now we have kept it flexible allowing any number of other key / value pairs...
    [key: string]: any;
};

// Represents a collection of fields.
export type FieldsMetadata = {
    [key: string]: Field;
};

// Solid View
export type SolidView = CommonEntity & {
    name: string;
    displayName: string;
    type: string;
    // TODO: maybe change this in the future to set this to a json object...
    context: string;
    layout: LayoutNode;
    model: Model;
    module: Module;
};

// Layout Types
export type LayoutAttribute = {
    name: string;
    label?: string;
    className?: string;
    inlineCreate?: string;
    renderMode?: string;
    widget?: string;
    visible?: boolean;
    editWidget?: string;
    viewWidget?: string;
    showLabel?: boolean;
    inlineListLayout?: any;
    inlineCreateLayout?: any;
    showDefaultAddButton?: boolean;
    showDefaultEditButton?: boolean;
    showEditFormButton?: boolean;
    showAddFormButton?: boolean;
    showDeleteFormButton?: boolean;
    formButtons?: any;
    rowButtons?: any;
    whereClause?: string;
    disabled?: boolean;
    readonly?: boolean;
    editAction?: any;
    createAction?: any;
    required?: boolean;
};

// Generic representation of any node in our layout 
export type LayoutNodeType = "form" | "sheet" | "notebook" | "page" | "row" | "column" | "field" | "div" | "p" | "span" | "h1" | "h2" | "h3" | "list" | "custom";
export type LayoutNode = {
    body?: string;
    type: LayoutNodeType;
    attrs: LayoutAttribute;
    children?: LayoutNode[];
};

export type ListLayoutType = {
    type: LayoutNodeType;
    attrs: LayoutAttribute;
    children?: any[];
};

// Event type
export type SolidUiEvents =
    // Implemented
    "onFieldChange" |
    // Implemented
    "onFieldBlur" |
    // Implemented
    "onFormDataLoad" |
    // Implemented
    "onFormLayoutLoad" |
    // Implemented
    "onFormLoad" |
    // Implemented
    "onListLoad" |
    // Implemented
    "onBeforeListDataLoad" |
    // Not Implemented
    "afterLogin" |
    // Not Implemented
    "beforeLogout" |
    // Implemented
    "onApplicationMount";
export type SolidUiEvent = {
    type: SolidUiEvents;
    modifiedField?: string;
    modifiedFieldValue?: any;
    queryParams?: any;
    // This comes from Formik...
    formData: Record<string, any>;
    viewMetadata: SolidView;
    fieldsMetadata: FieldsMetadata;
    formViewLayout: LayoutNode;
};

export type SolidUiEventResponse = {
    dataChanged?: Boolean;
    newFormData?: Record<string, any>;
    layoutChanged?: Boolean;
    newLayout?: LayoutNode;
}


export type SolidLoadForm = {
    parentData?: any,
    type: SolidUiEvents;
    formData: Record<string, any>;
    viewMetadata: SolidView;
    fieldsMetadata: FieldsMetadata;
    formViewLayout: LayoutNode;
    queryParams?: any;
}


export type SolidListUiEvent = {
    type: SolidUiEvents;
    listData: any[];
    fieldsMetadata: FieldsMetadata;
    totalRecords: number;
    viewMetadata: SolidView;
    listViewLayout: ListLayoutType;
    user: any;
    session: Session
};

export type SolidLoadList = {
    type: SolidUiEvents;
    listData: any[];
    fieldsMetadata: FieldsMetadata;
    totalRecords: number;
    viewMetadata: SolidView;
    listViewLayout: ListLayoutType;
    queryParams?: any,
    user: any,
    session: Session,
    params?: SolidListViewParams
}

export type SolidBeforeListDataLoad = {
    type: SolidUiEvents;
    fieldsMetadata: FieldsMetadata;
    viewMetadata: SolidView;
    listViewLayout: ListLayoutType;
    filter?: any,
    queryParams?: any,
    user: any,
    session: Session,
    params?: SolidListViewParams
}

export type SolidListUiEventResponse = {
    filterApplied?: Boolean;
    newFilter?: any;
    dataChanged?: Boolean;
    newListData?: any[];
    layoutChanged?: Boolean;
    newLayout?: LayoutNode;
}

export type SolidAfterLoginEvent = {
    type: SolidUiEvents;
    user: any
}

export type SolidOnApplicationMountEvent = {
    type: SolidUiEvents;
    user: any,
    session: Session
}

export enum SqlExpressionOperator {
    EQUALS = '$equals',
    NOT_EQUALS = '$notEquals',
    CONTAINS = '$contains',
    NOT_CONTAINS = '$notContains',
    STARTS_WITH = '$startsWith',
    ENDS_WITH = '$endsWith',
    IN = '$in',
    NOT_IN = '$notIn',
    BETWEEN = '$between',
    LT = '$lt',
    LTE = '$lte',
    GT = '$gt',
    GTE = '$gte'
}

export interface SqlExpression {
    variableName: string;
    operator: SqlExpressionOperator;
    value: string[];
}

export type SolidChartRendererProps = {
    question: any;
    filters: SqlExpression[];
    isPreview: boolean;
};

export type SolidFormWidgetProps = {
    field: any;
    // This comes from Formik...
    formData: Record<string, any>;
    viewMetadata: SolidView;
    fieldsMetadata: FieldsMetadata;
    formViewData: any;
};

export type SolidFormFieldWidgetProps = {
    formik: any;
    fieldContext?: SolidFieldProps;
}

export type SolidListFieldWidgetProps = {
    rowData: any;
    solidListViewMetaData: any
    fieldMetadata: FieldMetadata;
    column: any;
}

export type SolidMediaListFieldWidgetProps = SolidListFieldWidgetProps & {
    setLightboxUrls?: any,
    setOpenLightbox?: any
}

export type SolidMediaFormFieldWidgetProps = SolidFormFieldWidgetProps & {
    setLightboxUrls?: any,
    setOpenLightbox?: any
}

export type SolidShortTextImageRenderModeWidgetProps = {
    data: string;
}

export type SolidFormDynamicFunctionProps = {
    action: string,
    params: any,
    formik: any;
    solidFormViewMetaData: SolidView;
    rowData: any
}

export type SolidListHeaderDynamicFunctionProps = {
    action: string,
    params: any,
    solidListViewMetaData: any
}

export type SolidListRowdataDynamicFunctionProps = {
    action: string,
    params: any,
    rowData: any,
    solidListViewMetaData: any
}

export type RootState = ReturnType<ReturnType<typeof initializeStore>['getState']>;


export interface AiInteraction {
    id: number;
    thread_id: string;
    role: 'human' | 'gen-ai' | string;
    message: string;
    content_type?: string;
    status?: string;
    error_message?: string;
    model_used?: string;
    response_time_ms?: number;
    metadata?: string;
    is_applied?: boolean;
    created_at?: Date
}