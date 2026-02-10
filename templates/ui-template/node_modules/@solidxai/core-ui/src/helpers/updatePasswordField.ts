import { ERROR_MESSAGES } from "../constants/error-messages";
import { getSession } from "../adapters/auth/index";
import { env } from "../adapters/env";

export async function updatePasswordField({
  url,
  id,
  fieldName,
  fieldValue,
  confirmFieldName,
  confirmFieldValue,
}: {
  url: string;
  id: string | number;
  fieldName: string;
  fieldValue: string;
  confirmFieldName: string;
  confirmFieldValue: string;
}): Promise<void> {
  const baseUrl = `${env("NEXT_PUBLIC_BACKEND_API_URL")}/api`;
  const session = await getSession();

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (session?.user?.accessToken) {
    headers.set("Authorization", `Bearer ${session.user.accessToken}`);
  }
  const body = {
    [fieldName]: fieldValue,
    [confirmFieldName]: confirmFieldValue,
  };

  const response = await fetch(`${baseUrl}/${url}/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(ERROR_MESSAGES.FAILED_TO_UPDATE_PASSWORD);
  }
}
