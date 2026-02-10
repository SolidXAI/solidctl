declare module '*.png' {
    const value: string;
    export default value;
}

declare module '*.jpg' {
    const value: string;
    export default value;
}

declare module '*.jpeg' {
    const value: string;
    export default value;
}

declare module '*.svg' {
    const content: any;
    export default content;
}

// src/declarations.d.ts or types/declarations.d.ts
declare module '@solidxai/core-ui';
