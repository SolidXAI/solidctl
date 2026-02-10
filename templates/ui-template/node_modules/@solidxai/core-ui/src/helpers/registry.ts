import hanldeEmailFormTypeChange from "../components/core/extension/solid-core/emailTemplate/emailFormTypeChangeHandler";
import hanldeEmailFormTypeLoad from "../components/core/extension/solid-core/emailTemplate/emailFormTypeLoad";
import { RolePermissionsManyToManyFieldWidget } from "../components/core/extension/solid-core/roleMetadata/RolePermissionsManyToManyFieldWidget";
import { CustomHtml } from "../components/core/form/widgets/CustomHtml";
import React from "react";
import { SolidShortTextFieldImageListWidget } from "../components/core/list/widgets/SolidShortTextFieldImageRenderModeWidget";
import { SolidShortTextAvatarWidget } from "../components/core/list/widgets/SolidShortTextAvatarWidget";
import GenerateModelCodeRowAction from "../components/core/extension/solid-core/modelMetadata/list/GenerateModelCodeRowAction";
import GenerateModuleCodeRowAction from "../components/core/extension/solid-core/moduleMetadata/list/GenerateModuleCodeRowAction";
import { DefaultBooleanFormEditWidget, DefaultBooleanFormViewWidget, SolidBooleanCheckboxStyleFormEditWidget, SolidBooleanSwitchStyleFormEditWidget } from "../components/core/form/fields/SolidBooleanField";
import { DefaultDateFormEditWidget, DefaultDateFormViewWidget, PublishedStatusListViewWidget } from "../components/core/form/fields/SolidDateField";
import { DefaultDateTimeFormEditWidget, DefaultDateTimeFormViewWidget } from "../components/core/form/fields/SolidDateTimeField";
import { DefaultDecimalFormEditWidget, DefaultDecimalFormViewWidget } from "../components/core/form/fields/SolidDecimalField";
import { DefaultEmailFormEditWidget } from "../components/core/form/fields/SolidEmailField";
import { DefaultIntegerFormEditWidget, DefaultIntegerFormViewWidget, SolidIntegerSliderStyleFormEditWidget } from "../components/core/form/fields/SolidIntegerField";
import { DefaultJsonFormEditWidget, DefaultJsonFormViewWidget } from "../components/core/form/fields/SolidJsonField";
import { DefaultLongTextFormEditWidget, CodeEditorFormEditWidget, DynamicJsonEditorFormEditWidget, DynamicJsonEditorFormViewWidget, DynamicSelectionStaticEditWidget } from "../components/core/form/fields/SolidLongTextField";
import { DefaultMediaMultipleFormEditWidget, DefaultMediaMultipleFormViewWidget } from "../components/core/form/fields/SolidMediaMultipleField";
import { DefaultMediaSingleFormEditWidget, DefaultMediaSingleFormViewWidget } from "../components/core/form/fields/SolidMediaSingleField";
import { DefaultPasswordFormCreateWidget, DefaultPasswordFormEditWidget, DefaultPasswordFormViewWidget } from "../components/core/form/fields/SolidPasswordField";
import { DefaultRichTextFormEditWidget, DefaultRichTextFormViewWidget } from "../components/core/form/fields/SolidRichTextField";
import { DefaultSelectionStaticAutocompleteFormEditWidget, DefaultSelectionStaticFormViewWidget, SolidSelectionStaticRadioFormEditWidget, SolidSelectionStaticSelectButtonFormEditWidget } from "../components/core/form/fields/SolidSelectionStaticField";
import { DefaultShortTextFormEditWidget, DefaultShortTextFormViewWidget, MaskedShortTextFormViewWidget, MaskedShortTextFormEditWidget, MaskedShortTextListViewWidget } from "../components/core/form/fields/SolidShortTextField";
import { DefaultRelationManyToOneFormEditWidget, DefaultRelationManyToOneFormViewWidget, PseudoRelationManyToOneFormWidget } from "../components/core/form/fields/relations/SolidRelationManyToOneField";
import { DefaultRelationOneToManyFormEditWidget, DefaultRelationOneToManyFormViewWidget, PseudoRelationOneToManyFormWidget } from "../components/core/form/fields/relations/SolidRelationOneToManyField";
import { DefaultRelationManyToManyAutoCompleteFormEditWidget, DefaultRelationManyToManyCheckBoxFormEditWidget } from "../components/core/form/fields/relations/SolidRelationManyToManyField";
import { DefaultBooleanListWidget } from "../components/core/list/columns/SolidBooleanColumn";
import { DefaultTextListWidget } from "../components/core/list/columns/SolidShortTextColumn";
import { DefaultMediaSingleListWidget } from "../components/core/list/columns/SolidMediaSingleColumn";
import { DefaultMediaMultipleListWidget } from "../components/core/list/columns/SolidMediaMultipleColumn";
import { DefaultRelationManyToManyListWidget } from "../components/core/list/columns/relations/SolidRelationManyToManyColumn";
import { DefaultRelationManyToOneListWidget } from "../components/core/list/columns/relations/SolidRelationManyToOneColumn";
import { DefaultRelationOneToManyListWidget } from "../components/core/list/columns/relations/SolidRelationOneToManyColumn";
import { SolidRelationFieldAvatarFormWidget } from "../components/core/form/fields/widgets/SolidRelationFieldAvatarFormWidget";
import { DefaultSelectionDynamicFormEditWidget, DefaultSelectionDynamicFormViewWidget } from "../components/core/form/fields/SolidSelectionDynamicField";
import { SolidIconEditWidget } from "../components/core/form/fields/widgets/SolidIconEditWidget";
import { SolidIconViewWidget } from "../components/core/form/fields/widgets/SolidIconViewWidget";
import { SolidManyToManyRelationAvatarListWidget } from "../components/core/list/widgets/SolidManyToManyRelationAvatarListWidget";
import { SolidManyToOneRelationAvatarListWidget } from "../components/core/list/widgets/SolidManyToOneRelationAvatarListWidget";
import { SolidShortTextFieldAvatarWidget } from "../components/core/form/fields/widgets/SolidShortTextFieldAvatarWidget";
import DeleteModelRowAction from "../components/core/extension/solid-core/modelMetadata/list/DeleteModelRowAction";
import ChartFormPreviewWidget from "../components/core/extension/solid-core/dashboardQuestion/ChartFormPreviewWidget";
import { DefaultTimeFormEditWidget, DefaultTimeFormViewWidget } from "../components/core/form/fields/SolidTimeField";
import { SolidAiInteractionMetadataFieldFormWidget } from "../components/core/form/fields/widgets/SolidAiInteractionMetadataFieldFormWidget";
import { SolidAiInteractionMessageFieldFormWidget } from "../components/core/form/fields/widgets/SolidAiInteractionMessageFieldFormWidget";
import { SolidS3FileViewerWidget } from "../components/core/form/fields/widgets/SolidS3FileViewerWidget";
import DeleteModuleRowAction from "../components/core/extension/solid-core/moduleMetadata/list/DeleteModuleRowAction";

type ExtensionComponentType = null | 'list_field_widget' | 'form_field_view_widget' | 'form_field_edit_widget' | 'list_row_action ' | 'list_header_action' | 'form_action' | 'form_widget';

type ExtensionComponentMetadata = {
    component: React.ComponentType<any>;
    type: ExtensionComponentType;
    fieldType: string;
}


type ExtensionRegistry = {
    components: Record<string, ExtensionComponentMetadata>;
    functions: Record<string, (...args: any[]) => any>;
};

const extensionRegistry: ExtensionRegistry = {
    components: {},
    functions: {},
};

export const registerExtensionComponent = (name: string, component: React.ComponentType<any>, aliases: string[] = [], type: ExtensionComponentType = null, fieldType: string = '') => {
    extensionRegistry.components[name] = { 'component': component, 'type': type, 'fieldType': fieldType };
    for (let i = 0; i < aliases.length; i++) {
        const alias = aliases[i];
        extensionRegistry.components[alias] = { 'component': component, 'type': type, 'fieldType': fieldType };
    }
};

export const registerExtensionFunction = (name: string, fn: (...args: any[]) => any) => {
    extensionRegistry.functions[name] = fn;
};

export const getExtensionComponent = (name: string): React.ComponentType<any> | null => {
    if (extensionRegistry.components[name]) {
        return extensionRegistry.components[name].component;
    }

    return null;
};

export const getExtensionComponents = (type: ExtensionComponentType, fieldType: string = ''): string[] | [] => {
    // TODO: iterate over all registered extensionComponents to fetch a list of componnents matching the type & fieldType (optional)
    // if (extensionRegistry.components[name]) {
    //     return extensionRegistry.components[name].component;
    // }

    // return null;

    return [];
};

export const getExtensionFunction = (name: string) => {
    return extensionRegistry.functions[name];
};

// # Extension components 
// 1. list view columns field widget 
// - shortText
registerExtensionComponent("DefaultTextListWidget", DefaultTextListWidget, []);

// - shortText (image list)
registerExtensionComponent("SolidShortTextFieldImageListWidget", SolidShortTextFieldImageListWidget, []);

// - longText
registerExtensionComponent("SolidShortTextAvatarWidget", SolidShortTextAvatarWidget, []);

// - boolean
registerExtensionComponent("DefaultBooleanListWidget", DefaultBooleanListWidget, []);

// - mediaSingle
registerExtensionComponent("DefaultMediaSingleListWidget", DefaultMediaSingleListWidget, []);

// - mediaMultiple
registerExtensionComponent("DefaultMediaMultipleListWidget", DefaultMediaMultipleListWidget, []);

// - relation.many2one
registerExtensionComponent("DefaultRelationManyToOneListWidget", DefaultRelationManyToOneListWidget, []);

// - relation.many2one (avatar)
registerExtensionComponent("SolidManyToOneRelationAvatarListWidget", SolidManyToOneRelationAvatarListWidget, []);

// - relation.many2many
registerExtensionComponent("DefaultRelationManyToManyListWidget", DefaultRelationManyToManyListWidget, []);

// - relation.many2many (avatar)
registerExtensionComponent("SolidManyToManyRelationAvatarListWidget", SolidManyToManyRelationAvatarListWidget, []);

// - relation.one2many
registerExtensionComponent("DefaultRelationOneToManyListWidget", DefaultRelationOneToManyListWidget, []);

// ...


// 2. form view field edit widget 
// - shortText
registerExtensionComponent("DefaultShortTextFormEditWidget", DefaultShortTextFormEditWidget, []);

// - shortText (masked)
registerExtensionComponent("MaskedShortTextFormEditWidget", MaskedShortTextFormEditWidget, ["maskedShortTextEdit"]);

// - longText
registerExtensionComponent("DefaultLongTextFormEditWidget", DefaultLongTextFormEditWidget, []);

// - longText (json editor)
registerExtensionComponent("DynamicJsonEditorFormEditWidget", DynamicJsonEditorFormEditWidget, ["jsonEditor"]);

// - longText (json viewer)
registerExtensionComponent("DynamicJsonEditorFormViewWidget", DynamicJsonEditorFormViewWidget, ["jsonViewer"]);

// - longText (code editor)
registerExtensionComponent("CodeEditorFormEditWidget", CodeEditorFormEditWidget, ["codeEditor"]);

// - time
registerExtensionComponent("DefaultTimeFormEditWidget", DefaultTimeFormEditWidget, []);

// - date
registerExtensionComponent("DefaultDateFormEditWidget", DefaultDateFormEditWidget, []);

// - datetime
registerExtensionComponent("DefaultDateTimeFormEditWidget", DefaultDateTimeFormEditWidget, []);

// - boolean
registerExtensionComponent("DefaultBooleanFormEditWidget", DefaultBooleanFormEditWidget, ["booleanSelectbox"]);

// - boolean (checkbox)
registerExtensionComponent("SolidBooleanCheckboxStyleFormEditWidget", SolidBooleanCheckboxStyleFormEditWidget, ["booleanCheckbox"]);

// - boolean (switch)
registerExtensionComponent("SolidBooleanSwitchStyleFormEditWidget", SolidBooleanSwitchStyleFormEditWidget, []);

// - integer
registerExtensionComponent("DefaultIntegerFormEditWidget", DefaultIntegerFormEditWidget, []);

// - integer (slider)
registerExtensionComponent("SolidIntegerSliderStyleFormEditWidget", SolidIntegerSliderStyleFormEditWidget, ["integerSlider"]);

// - decimal
registerExtensionComponent("DefaultDecimalFormEditWidget", DefaultDecimalFormEditWidget, []);

// - email
registerExtensionComponent("DefaultEmailFormEditWidget", DefaultEmailFormEditWidget, []);

// - json
registerExtensionComponent("DefaultJsonFormEditWidget", DefaultJsonFormEditWidget, []);

// - password
registerExtensionComponent("DefaultPasswordFormEditWidget", DefaultPasswordFormEditWidget, []);

// - password (create)
registerExtensionComponent("DefaultPasswordFormCreateWidget", DefaultPasswordFormCreateWidget, []);

// - richText
registerExtensionComponent("DefaultRichTextFormEditWidget", DefaultRichTextFormEditWidget, []);

// - selectionStatic (autocomplete)
registerExtensionComponent("DefaultSelectionStaticAutocompleteFormEditWidget", DefaultSelectionStaticAutocompleteFormEditWidget, []);

// - selectionStatic (radio)
registerExtensionComponent("SolidSelectionStaticRadioFormEditWidget", SolidSelectionStaticRadioFormEditWidget, []);

// - selectionStatic (selectButton)
registerExtensionComponent("SolidSelectionStaticSelectButtonFormEditWidget", SolidSelectionStaticSelectButtonFormEditWidget, []);

// - selectionDynamic
registerExtensionComponent("DefaultSelectionDynamicFormEditWidget", DefaultSelectionDynamicFormEditWidget, []);

// mediaSingle
registerExtensionComponent("DefaultMediaSingleFormEditWidget", DefaultMediaSingleFormEditWidget, []);

// mediaMultiple
registerExtensionComponent("DefaultMediaMultipleFormEditWidget", DefaultMediaMultipleFormEditWidget, []);

// - relation.many2one
registerExtensionComponent("DefaultRelationManyToOneFormEditWidget", DefaultRelationManyToOneFormEditWidget, []);

registerExtensionComponent("PseudoRelationManyToOneFormWidget", PseudoRelationManyToOneFormWidget, []);


// - relation.many2many (autocomplete)
registerExtensionComponent("DefaultRelationManyToManyAutoCompleteFormEditWidget", DefaultRelationManyToManyAutoCompleteFormEditWidget, []);

// - relation.many2many (checkbox)
registerExtensionComponent("DefaultRelationManyToManyCheckBoxFormEditWidget", DefaultRelationManyToManyCheckBoxFormEditWidget, []);

// - relation.one2many
registerExtensionComponent("DefaultRelationOneToManyFormEditWidget", DefaultRelationOneToManyFormEditWidget, []);
registerExtensionComponent("PseudoRelationOneToManyFormWidget", PseudoRelationOneToManyFormWidget, []);

// ...


// 3. form view field view widget 
// - shortText
// - longText
// - integer
// - decimal
// - email
registerExtensionComponent("DefaultShortTextFormViewWidget", DefaultShortTextFormViewWidget, []);

// - shortText (masked)
registerExtensionComponent("MaskedShortTextFormViewWidget", MaskedShortTextFormViewWidget, ["maskedShortTextForm"]);

// - time
registerExtensionComponent("DefaultTimeFormViewWidget", DefaultTimeFormViewWidget, []);

// - date
registerExtensionComponent("DefaultDateFormViewWidget", DefaultDateFormViewWidget, []);

// - datetime
registerExtensionComponent("DefaultDateTimeFormViewWidget", DefaultDateTimeFormViewWidget, []);

// - boolean
registerExtensionComponent("DefaultBooleanFormViewWidget", DefaultBooleanFormViewWidget, []);

// - json
registerExtensionComponent("DefaultJsonFormViewWidget", DefaultJsonFormViewWidget, []);

// - password
registerExtensionComponent("DefaultPasswordFormViewWidget", DefaultPasswordFormViewWidget, []);

// - richText
registerExtensionComponent("DefaultRichTextFormViewWidget", DefaultRichTextFormViewWidget, []);


// - int
registerExtensionComponent("DefaultIntegerFormViewWidget", DefaultIntegerFormViewWidget, []);

// - Decimal
registerExtensionComponent("DefaultDecimalFormViewWidget", DefaultDecimalFormViewWidget, []);

// - selectionStatic
registerExtensionComponent("DefaultSelectionStaticFormViewWidget", DefaultSelectionStaticFormViewWidget, []);

// - selectionDynamic
registerExtensionComponent("DefaultSelectionDynamicFormViewWidget", DefaultSelectionDynamicFormViewWidget, []);

// mediaSingle
registerExtensionComponent("DefaultMediaSingleFormViewWidget", DefaultMediaSingleFormViewWidget, []);

//mediaMultiple
registerExtensionComponent("DefaultMediaMultipleFormViewWidget", DefaultMediaMultipleFormViewWidget, []);

// - relation.many2one
registerExtensionComponent("DefaultRelationManyToOneFormViewWidget", DefaultRelationManyToOneFormViewWidget, []);

// - relation.many2many
// - relation.one2many
registerExtensionComponent("DefaultRelationOneToManyFormViewWidget", DefaultRelationOneToManyFormViewWidget, []);

// ...

// 4. list row action 
registerExtensionComponent("GenerateModelCodeRowAction", GenerateModelCodeRowAction, []);
registerExtensionComponent("GenerateModuleCodeRowAction", GenerateModuleCodeRowAction, []);
registerExtensionComponent("DeleteModelRowAction", DeleteModelRowAction, []);
registerExtensionComponent("DeleteModuleRowAction", DeleteModuleRowAction, []);

// 7. form widget 
registerExtensionComponent("CustomHtml", CustomHtml, []);

// Common
registerExtensionComponent("ChartFormPreviewWidget", ChartFormPreviewWidget, ["chart"]);

// Formview Default View widgets
registerExtensionComponent("MaskedShortTextListViewWidget", MaskedShortTextListViewWidget, ["maskedShortTextList"]);
registerExtensionComponent("PublishedStatusListViewWidget",PublishedStatusListViewWidget,["publishedStatus"])

// Formview Custom view widgets
registerExtensionComponent("SolidRelationFieldAvatarFormWidget", SolidRelationFieldAvatarFormWidget, []);
registerExtensionComponent("SolidShortTextFieldAvatarWidget", SolidShortTextFieldAvatarWidget, []);
registerExtensionComponent("SolidAiInteractionMetadataFieldFormWidget", SolidAiInteractionMetadataFieldFormWidget, []);
registerExtensionComponent("SolidAiInteractionMessageFieldFormWidget", SolidAiInteractionMessageFieldFormWidget, []);
registerExtensionComponent("SolidS3FileViewerWidget", SolidS3FileViewerWidget, []);

// RoleMetadata
registerExtensionComponent("RolePermissionsManyToManyFieldWidget", RolePermissionsManyToManyFieldWidget, ["inputSwitch"]);

// Solid Google Material Symbols Icon
registerExtensionComponent("SolidIconEditWidget", SolidIconEditWidget, []);
registerExtensionComponent("SolidIconViewWidget", SolidIconViewWidget, []);

// # Extension functions 
// Email Template
registerExtensionFunction("emailFormTypeChangeHandler", hanldeEmailFormTypeChange);
registerExtensionFunction("emailFormTypeLoad", hanldeEmailFormTypeLoad);

// Model Sequence 
// TODO: @Jyotsana you need to create an extension function which will be used "onFieldChange"
// on change of module, apply a where clause on the model & field fields.. 
// on change of model, apply a where clause on the field field...
