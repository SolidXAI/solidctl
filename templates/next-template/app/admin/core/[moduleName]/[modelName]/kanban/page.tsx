"use client"
import { SolidKanbanView } from "@solidstarters/solid-core-ui";
import { camelCase } from "change-case";

type SolidViewParams = {
  params: {
    moduleName: string;
    modelName: string;
  };
};

const page = ({ params }: SolidViewParams) => {
  return (
    <SolidKanbanView {...params} embeded={false} modelName={camelCase(params.modelName)} />
  );
};

export default page;
