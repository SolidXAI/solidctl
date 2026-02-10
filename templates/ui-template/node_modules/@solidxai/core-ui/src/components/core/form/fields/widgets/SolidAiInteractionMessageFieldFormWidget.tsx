
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import MarkdownViewer from "../../../../../components/common/MarkdownViewer";
import ReactCodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { ERROR_MESSAGES } from "../../../../../constants/error-messages";


export const SolidAiInteractionMessageFieldFormWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const userKeyFieldName = fieldMetadata.relationModel?.userKeyField?.name;
    const value = formik.values[fieldLayoutInfo.attrs.name];
    const contentType = formik?.values?.contentType ? formik?.values?.contentType : "markdown"

    const renderContent = () => {

        switch (contentType) {
            case 'json':
                return (
                    <JsonDisplay message={value} />
                )
            case 'markdown':
                return (
                    <MarkdownDisplay message={value} />
                )
            case 'plain_text':
            default:
                return <PlainTextDisplay message={value} />
        }
    }

    return (
        <div className="mt-2 flex-column">
            <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            {value && renderContent()}
        </div>
    );
}



export interface MarkdownDisplayProps {
    message: any
}

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ message }) => {
    // const jsonMsg = JSON.parse(interaction.message);
    // const markdown = jsonMsg.data;
    let jsonMsg: any;
    let markdown: string;

    try {
        if (typeof message === "string") {
            try {
                jsonMsg = JSON.parse(message.trim());
                markdown = jsonMsg?.data ?? "";
            } catch (jsonErr) {
                // Not valid JSON → treat the raw string as markdown
                markdown = message.trim();
            }
        } else if (typeof message === "object" && message !== null) {
            // Already an object
            jsonMsg = message;
            markdown = jsonMsg?.data ?? "";
        } else {
            // Fallback for other types
            markdown = String(message ?? "");
        }
    } catch (err: any) {
        // Worst-case fallback: put the error string in markdown
        markdown = ERROR_MESSAGES.INTERATCTION_MESSGAE(err?.message,err);
        
    }
    // 🔧 Normalize escaped newlines, tabs, and quotes
    if (markdown.includes("\\n")) {
        markdown = markdown
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "")
            .replace(/\\"/g, '"');
    }

    // ✅ markdown is now clean and render-ready

    return (
        <div className={`p-3 `} style={{ width: '100%' }}>
            <MarkdownViewer data={markdown} />
        </div>
    )
}


export interface JsonDisplayProps {
    message: any
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ message }) => {
    let formattedJson = ''
    try {
        const parsed = JSON.parse(message)
        formattedJson = JSON.stringify(parsed, null, 2)
    } catch (e) {
        // formattedJson = 'Invalid JSON'
        formattedJson = message;
    }

    return (
        <div className={`p-3 `} style={{ width: '100%' }}>
            <ReactCodeMirror
                value={formattedJson}
                style={{ fontSize: '10px' }}
                theme={oneDark}
                extensions={[javascript(), EditorView.lineWrapping]}
            />
        </div>
    )
}



export interface PlainTextDisplayProps {
    message: any
}

export const PlainTextDisplay: React.FC<PlainTextDisplayProps> = ({ message }) => {
    return (
        <div className={`p-3`}>
            {message}
        </div>
    )
}
