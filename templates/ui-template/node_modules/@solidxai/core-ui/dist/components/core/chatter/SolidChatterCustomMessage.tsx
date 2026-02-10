
import React from 'react'
import MarkdownViewer from '../../../components/common/MarkdownViewer'

interface SolidChatterCustomMessageProps {
    message: string;
}

const isMarkupLanguage = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;

    const markdownPatterns = [
        /^#{1,6}\s+/m,
        /\*\*.*?\*\*/,
        /\*.*?\*/,
        /`.*?`/,
        /```[\s\S]*?```/,
        /^\s*[-*+]\s+/m,
        /^\s*\d+\.\s+/m,
        /\[.*?\]\(.*?\)/,
        /^\s*\|.*\|/m,
        /^\s*>\s+/m,
    ];

    // Check for HTML tags
    const htmlPattern = /<\/?[a-z][\s\S]*?>/i;

    return markdownPatterns.some(pattern => pattern.test(text)) || htmlPattern.test(text);
};

export const SolidChatterCustomMessage: React.FC<SolidChatterCustomMessageProps> = ({ message }) => {
    const isMarkup = isMarkupLanguage(message);
    if (isMarkup) {
        return (
            <div className="custom-message-wrapper">
                <MarkdownViewer data={message} />
            </div>
        );
    }

    return (
        <p className='m-0 text-sm'>
            {message}
        </p>
    );
};