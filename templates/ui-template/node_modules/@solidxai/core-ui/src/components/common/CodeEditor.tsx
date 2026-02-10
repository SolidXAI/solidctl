

import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror, { EditorView } from '@uiw/react-codemirror'; // Correct import

const CodeEditor = ({ formik, field, height, fontSize, readOnly }: any) => {
  let code;
  const value = formik?.values[field];

  if (value == null) {
    // null or undefined → empty string
    code = "";
  } else if (typeof value === "string") {
    code = value;
  } else {
    code = JSON.stringify(value, null, 2);
  }


  return (
    <CodeMirror
      id={field}
      value={code}
      height={height ?? '300px'}
      style={{ fontSize: fontSize ?? '10px' }}
      theme={oneDark}
      readOnly={readOnly}
      extensions={[javascript(), EditorView.lineWrapping]}
      onChange={(e: any) => {
        formik.setFieldValue(field, e);
      }}
    // Line numbers are now handled through a theme or extension
    />
  );
};

export default CodeEditor;
