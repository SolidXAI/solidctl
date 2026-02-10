
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import MarkdownViewer from "../../../../../components/common/MarkdownViewer";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { TabView, TabPanel } from "primereact/tabview";
import ReactCodeMirror, { EditorView, oneDark } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

export const SolidAiInteractionMetadataFieldFormWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const userKeyFieldName = fieldMetadata.relationModel?.userKeyField?.name;
    const value = formik.values[fieldLayoutInfo.attrs.name];

    return (
        <div className="mt-2 flex-column">
            {/* <p className="m-0 form-field-label font-medium">{fieldLabel}</p> */}

            <TabView>
                {/* -------------------- Tab 1: Metadata & Prompts -------------------- */}
                <TabPanel header="Chunks">
                    <div className="solid-layout-accordion">
                        <Accordion multiple expandIcon="pi pi-chevron-down" collapseIcon="pi pi-chevron-up" activeIndex={[0]}>
                            {value?.chunks?.map((c: any) => {
                                let processedText = c.text || '';
                                const meta = c.metadata || {};

                                // 🧠 Identify type
                                const isDoc = !!meta.path || meta.source === "docusaurus";
                                const isModule = meta.type === "module";
                                const isModel = meta.type === "model";

                                // 🧹 Clean text for docs
                                if (isDoc) {
                                    processedText = processedText
                                        .replace(/^Document Title:\s*/i, "")
                                        .replace(/^Text:\s*/i, "")
                                        .trim();
                                }

                                // 🧩 Extract "Full model metadata json" if present
                                if (isModel) {
                                    const match = processedText.match(/Full model metadata json:\s*\n?({[\s\S]+})/);
                                    if (match) {
                                        try {
                                            // Format the JSON nicely
                                            const pretty = JSON.stringify(JSON.parse(match[1]), null, 2);
                                            // Replace the raw JSON text with a fenced code block
                                            processedText = processedText.replace(
                                                match[0],
                                                `**Full model metadata json:**\n\n\`\`\`json\n${pretty}\n\`\`\``
                                            );
                                        } catch {
                                            // Fallback: wrap raw text if JSON invalid
                                            processedText = processedText.replace(
                                                match[0],
                                                `**Full model metadata json (raw):**\n\n\`\`\`\n${match[1]}\n\`\`\``
                                            );
                                        }
                                    }
                                }

                                // 🏷️ Header label
                                let headerTitle = "Unknown";
                                if (isModule) {
                                    headerTitle = `Module: ${meta.moduleName} (${meta.modelCount} models)`;
                                } else if (isModel) {
                                    headerTitle = `Model: ${meta.modelName} (${meta.fieldCount} fields)`;
                                } else if (isDoc) {
                                    headerTitle = `Doc: ${meta.title || meta.doc_title || meta.path}`;
                                }

                                // 🌐 External link (docs only)
                                const openDoc = (e: any) => {
                                    e.stopPropagation();
                                    if (isDoc) {
                                        const cleanPath = (meta.path || "").replace(/\.md$/, "");
                                        const url = `https://docs.solidxai.com/docs/${cleanPath}`;
                                        window.open(url, "_blank");
                                    }
                                };

                                return (
                                    <AccordionTab
                                        key={c.id}
                                        header={
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-medium">{headerTitle}</span>
                                                {isDoc && (
                                                    <Button
                                                        icon="pi pi-external-link"
                                                        rounded
                                                        text
                                                        outlined
                                                        style={{ height: "1.5rem" }}
                                                        onClick={openDoc}
                                                    />
                                                )}
                                            </div>
                                        }
                                    >
                                        <div key={c.id} className="shadow-1 bg-bluegray-50 p-3">
                                            <MarkdownViewer data={processedText} />
                                        </div>
                                    </AccordionTab>
                                );
                            })}
                        </Accordion>
                    </div>
                </TabPanel>
                <TabPanel header="System Prompt">
                    {value?.system_prompt && (
                        <div>
                            <MarkdownViewer data={value.system_prompt} />
                        </div>
                    )}
                </TabPanel>
                <TabPanel header="User Prompt">
                    {value?.user_prompt && (
                        <div>
                            <MarkdownViewer data={value.user_prompt} />
                        </div>
                    )}
                </TabPanel>
                <TabPanel header="Token Usage">
                    {value?.tokenUsage && (
                        <div className={`p-3 `} style={{ width: '100%' }}>
                            <ReactCodeMirror
                                value={JSON.stringify(value.tokenUsage, null, 2)}
                                style={{ fontSize: '10px' }}
                                theme={oneDark}
                                extensions={[javascript(), EditorView.lineWrapping]}
                            />
                        </div>
                    )}
                </TabPanel>
            </TabView>
        </div>
    );
}

