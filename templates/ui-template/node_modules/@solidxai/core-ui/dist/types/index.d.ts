declare module "react-star-ratings";
declare module "react-js-pagination";
declare module "bcryptjs";
declare module "nodemailer";
declare module "mapbox-gl/dist/mapbox-gl.js";
declare module "react-datepicker";
declare module "moment";

import React, { ReactNode } from 'react';
import {
    LayoutConfig,
    LayoutState,
    LayoutContextProps,
    AppConfigProps
} from './layout';

import {
    CommonEntity,
    ModelMetadata,
    ModuleMetadata,
    FieldMetadata,
    FieldsMetadata,
    SolidView,
    LayoutAttribute,
    LayoutNode,
    LayoutNodeType,
    SolidUiEvents,
    SolidUiEvent,
    SolidListUiEvent,
    SolidLoadForm,
    SolidUiEventResponse,
    SolidLoadList,
    SolidListUiEventResponse,
    SolidFormWidgetProps,
    SolidFormFieldWidgetProps,
    SolidChartRendererProps,
    SolidBeforeListDataLoad
} from './solid-core';

type ChildContainerProps = {
    children: ReactNode;
};

export interface MenuContextProps {
    activeMenu: string;
    setActiveMenu: Dispatch<SetStateAction<string>>;
}

export type {
    LayoutConfig,
    LayoutState,
    LayoutContextProps,
    ChildContainerProps,
    AppConfigProps,
    MenuContextProps,
    CommonEntity,
    ModelMetadata,
    ModuleMetadata,
    FieldMetadata,
    FieldsMetadata,
    SolidView,
    LayoutAttribute,
    LayoutNode,
    LayoutNodeType,
    SolidUiEvents,
    SolidUiEvent,
    SolidLoadList,
    SolidUiEventResponse,
    SolidListUiEventResponse,
    SolidListUiEvent,
    SolidLoadForm,
    SolidFormWidgetProps,
    SolidChartRendererProps,
    SolidFormFieldWidgetProps,
    SolidBeforeListDataLoad
};
