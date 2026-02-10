import { env } from "../adapters/env";

export const revalidateTag = async (tag: string) => {
  await fetch(
    `${env("API_URL")}/api/revalidate?tag=${tag}&secret=${env("REVALIDATE_TOKEN")}`,
    { method: "POST" }
  );
};
