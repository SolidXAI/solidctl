"use client"
import { SolidListView } from "@solidx/solid-core-ui";
import { camelCase } from "change-case";

type SolidViewParams = {
  params: {
    moduleName: string;
    modelName: string;
  };
};

const page = ({ params }: SolidViewParams) => {
  return (
    <SolidListView {...params} embeded={false} modelName={camelCase(params.modelName)} />
  );
};

export default page;
