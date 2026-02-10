# Installation
> `npm install --save @types/react-text-mask`

# Summary
This package contains type definitions for react-text-mask (https://github.com/text-mask/text-mask/tree/master/react).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-text-mask.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-text-mask/index.d.ts)
````ts
import * as React from "react";

export type Mask = Array<string | RegExp> | false;

export interface PipeConfig {
    placeholder: string;
    placeholderChar: string;
    currentCaretPosition: number;
    keepCharPositions: boolean;
    rawValue: string;
    guide: boolean | undefined;
    previousConformedValue: string | undefined;
}

export type ConformToMaskConfig = Partial<Omit<PipeConfig, "rawValue">>;

export interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    mask: Mask | ((value: string) => Mask);

    guide?: boolean;

    placeholderChar?: string;

    keepCharPositions?: boolean;

    pipe?: (
        conformedValue: string,
        config: PipeConfig,
    ) => false | string | { value: string; indexesOfPipedChars: number[] };

    showMask?: boolean;

    render?: (
        ref: (inputElement: HTMLElement) => void,
        props: {
            onChange: (event: React.ChangeEvent<HTMLElement>) => void;
            onBlur: (event: React.FocusEvent<HTMLElement>) => void;
            defaultValue: string | undefined;
        },
    ) => React.ReactNode;
}

export interface ConformToMaskResult {
    conformedValue: string;
    meta: {
        someCharsRejected: boolean;
    };
}

export default class MaskedInput extends React.Component<MaskedInputProps, any> {
    inputElement: HTMLElement;
}

export function conformToMask(
    text: string,
    mask: Mask | ((value: string) => Mask),
    config?: ConformToMaskConfig,
): ConformToMaskResult;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 09:09:39 GMT
 * Dependencies: [@types/react](https://npmjs.com/package/@types/react)

# Credits
These definitions were written by [Guilherme Hübner](https://github.com/guilhermehubner), [Deividi Cavarzan](https://github.com/cavarzan), and [Artem Lyubchuk](https://github.com/needpower).
