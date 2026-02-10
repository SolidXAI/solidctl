import React from "react";
import { env } from "../../../adapters/env";

interface PasswordHelperTextProps {
  text?: any;
}

export const SolidPasswordHelperText: React.FC<PasswordHelperTextProps> = ({ text }) => {
  const envPasswordHelperText = env("NEXT_PUBLIC_PASSWORD_COMPLEXITY_DESC") ?? "";

  if (!text && !envPasswordHelperText) return null;

  return (
    <div className="mt-4 text-sm grid">
      {text ?
        <div dangerouslySetInnerHTML={{ __html: text }}></div>
        :
        <div className="col-12">
          <div className="grid">
            {envPasswordHelperText.split("\\n").map((line, idx) => (
              <div key={idx} className="col-6 pt-0">
                <div className="flex gap-2">
                  <span>•</span>
                  <span>{line}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    </div>
  );
};
