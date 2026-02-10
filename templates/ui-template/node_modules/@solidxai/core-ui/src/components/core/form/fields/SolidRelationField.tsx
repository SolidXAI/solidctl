
import { Schema } from "yup";
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { SolidRelationManyToManyField } from "./relations/SolidRelationManyToManyField";
import { SolidRelationManyToOneField } from "./relations/SolidRelationManyToOneField";
import { SolidRelationOneToManyField } from "./relations/SolidRelationOneToManyField";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";


export class SolidRelationField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    relationField(): ISolidField {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        let relationField = null;

        if (fieldMetadata.relationType === 'many-to-one') {
            relationField = new SolidRelationManyToOneField(this.fieldContext);
        }
        if (fieldMetadata.relationType === 'many-to-many') {
            relationField = new SolidRelationManyToManyField(this.fieldContext);
        }
        if (fieldMetadata.relationType === 'one-to-many') {
            relationField = new SolidRelationOneToManyField(this.fieldContext);
        }

        if (!relationField) {
            throw new Error(ERROR_MESSAGES.INVALID_RELATION_TYPE(fieldMetadata.relationType , this.fieldContext.field.attrs.name))
            
        }

        return relationField;
    }

    initialValue(): any {
        return this.relationField()?.initialValue();
    }

    updateFormData(value: any, formData: FormData): any {
        return this.relationField().updateFormData(value, formData);

    }

    validationSchema(): Schema {
        return this.relationField().validationSchema();
    }

    render(formik: FormikObject) {
        return this.relationField().render(formik);
    }
}
