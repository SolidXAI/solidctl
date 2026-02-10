

import { SolidFormWidgetProps } from "../../../../types";
import parse from 'html-react-parser';
// import Handlebars from "handlebars/dist/handlebars";
import * as Handlebars from "handlebars";

export const CustomHtml = ({ field, formData, viewMetadata, fieldsMetadata }: SolidFormWidgetProps) => {
    let { type, attrs, body, children } = field;
    
    // TODO: null check on this field required, show a proper error message on the UI suggesting that you are using a CustomHtml widget, however the html is not specified in the layout.
    const html = attrs.html;

    // TODO: run dompurify to avoid XSS attacks...

    // TODO: assume the html is a handlebars template, we try to do variable replacement on it using formData.
    const template = Handlebars.compile(html);

    return (<div className={attrs.className}>{parse(template(formData))}</div>)
}
