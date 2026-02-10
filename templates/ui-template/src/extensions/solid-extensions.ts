import { registerExtensionComponent, registerExtensionFunction } from "@solidxai/core-ui";
import callLogsDispositionHandler from "./venue/call-log/form-event-listeners/callLogsDispositionHandler";
import { ImportHierarchyComponent } from "./venue/hierarchy-import-transaction/form-buttons/ImportHierarchyComponent";
import onHierarchyImportFormLayoutLoadHandler from "./venue/hierarchy-import-transaction/form-event-listeners/onHierarchyImportFormLoadHandler";
import handleVenueUserFormViewChange from "./venue/venue-user/form-event-listeners/venueUserFormViewChangeHandler";
import handleVenueUserFormViewLoad from "./venue/venue-user/form-event-listeners/venueUserFormViewLoadHandler";

// Module - venue 

// - - - - - - - - - - - - - - - - - - - -
// Model - call-log 
// - - - - - - - - - - - - - - - - - - - -

// custom-widgets 

// form-buttons

// form-event-listeners (onFormLayoutLoad, onFormDataLoad, onFormLoad)
registerExtensionFunction('callLogsDispositionHandler', callLogsDispositionHandler);

// list-buttons

// list-event-listeners (onListLoad, onBeforeListDataLoad)

// row-buttons



// - - - - - - - - - - - - - - - - - - - -
// Model - hierarchy-import-transaction
// - - - - - - - - - - - - - - - - - - - -

// custom-widgets 

// form-buttons
registerExtensionComponent('ImportHierarchyComponent', ImportHierarchyComponent);

// form-event-listeners (onFormLayoutLoad, onFormDataLoad, onFormLoad)
registerExtensionFunction('onHierarchyImportFormLayoutLoadHandler', onHierarchyImportFormLayoutLoadHandler);

// list-buttons

// list-event-listeners (onListLoad, onBeforeListDataLoad)

// row-buttons



// - - - - - - - - - - - - - - - - - - - -
// Model - venue-user
// - - - - - - - - - - - - - - - - - - - -

// custom-widgets 

// form-buttons

// form-event-listeners (onFormLayoutLoad, onFormDataLoad, onFormLoad)
registerExtensionFunction('venueUserFormViewChangeHandler', handleVenueUserFormViewChange);

// list-buttons

// list-event-listeners (onListLoad, onBeforeListDataLoad)

// row-buttons


// - - - - - - - - - - - - - - - - - - - -
// Model - venue-master
// - - - - - - - - - - - - - - - - - - - -

// custom-widgets 

// form-buttons

// form-event-listeners (onFormLayoutLoad, onFormDataLoad, onFormLoad)
registerExtensionFunction('venueUserFormViewLoadHandler', handleVenueUserFormViewLoad);

// list-buttons

// list-event-listeners (onListLoad, onBeforeListDataLoad)

// row-buttons
