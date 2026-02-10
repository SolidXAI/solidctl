import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";

export const AnthropicProviderComponent = ({ profile, onUpdate }: any) => {
  return (
    <div className="grid">
      <div className="field col-12 md:col-6 pl-3">
        <div className="flex flex-column gap-2 mt-3">
          <label htmlFor="displayName" className="form-field-label">
            Base URL
          </label>
          <InputText
            value={profile?.baseUrl || ""}
            onChange={(e) => onUpdate("baseUrl", e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-column gap-2 mt-3">
          <label htmlFor="displayName" className="form-field-label">
            Api Key
          </label>
          <Password
            className="w-full"
            value={profile?.apiKey || ""}
            onChange={(e) => onUpdate("apiKey", e.target.value)}
            toggleMask
            feedback={false}
            inputClassName="w-full"
          />
        </div>
        <div className="flex flex-column gap-2 mt-3">
          <label htmlFor="displayName" className="form-field-label">
            Model Name
          </label>
          <InputText
            value={profile?.modelName || ""}
            onChange={(e) => onUpdate("modelName", e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
