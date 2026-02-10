

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type MarkdownViewerProps = { data: string };

// Custom CodeBlock renderer
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const codeString = String(children).replace(/\n$/, '');
  const isFenced = !inline && /language-(\w+)/.test(className || '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] ?? '';

  if (inline || !isFenced) {
    // Inline code or non-fenced code
    return (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
        {children}
      </code>
    );
  }

  // Fenced code block
  return (
    <div className="relative group my-4">
      <button
        className="absolute right-2 top-2 px-2 py-1 text-xs rounded bg-white text-black transition"
        style={{ cursor: 'pointer',right:0  }}
        onClick={() => navigator.clipboard.writeText(codeString)}
      >
        Copy
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        PreTag="div"
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.85rem',
          background: '#282c34',
        }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ data }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]} // Enable GitHub-style tables
    className="markdown-view prose prose-invert max-w-none"
    components={{
      code: CodeBlock,
      table: (props) => (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-700 text-sm">
            {props.children}
          </table>
        </div>
      ),
      th: (props) => (
        <th className="border border-gray-700 px-3 py-1 font-semibold text-left bg-gray-800" style={{color:"#fff"}}>
          {props.children}
        </th>
      ),
      td: (props) => (
        <td className="border border-gray-700 px-3 py-1 align-top">
          {props.children}
        </td>
      ),
    }}
  >
    {data}
  </ReactMarkdown>
);

export default MarkdownViewer;
