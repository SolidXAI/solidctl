
import { pascalCase } from "change-case";

//Dynamic permission expression
export const permissionExpression = (modelName: string, permissionName : string) => {
    return `${pascalCase(modelName)}Controller.${permissionName}`
};