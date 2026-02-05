"use client"
import { SolidFormLayouts } from "@solidxai/core-ui";

type SolidViewParams = {
  params: {
    moduleName: string;
    modelName: string;
    id: string;
  };
};

const page = ({ params }: SolidViewParams) => {

  return (
    <SolidFormLayouts params={params} />
  );
};

export default page;