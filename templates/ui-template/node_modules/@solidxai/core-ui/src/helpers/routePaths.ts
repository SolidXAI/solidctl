export const normalizeSolidListKanbanActionPath = (currentPath: string, actionUrl: string) => {
  if (!actionUrl) return "";
  if (actionUrl.startsWith("http") || actionUrl.startsWith("/")) {
    return actionUrl;
  }

  const basePath = currentPath.replace(/\/(list|kanban)(\/)?$/, "");
  const normalizedBase = basePath.length > 0 ? basePath : "/";
  const actionTrimmed = actionUrl.replace(/^\/+/, "");

  return `${normalizedBase.replace(/\/+$/, "")}/${actionTrimmed}`;
};

export const normalizeSolidFormActionPath = (currentPath: string, actionUrl: string) => {
  if (!actionUrl) return "";
  if (actionUrl.startsWith("http") || actionUrl.startsWith("/")) {
    return actionUrl;
  }

  const basePath = currentPath.replace(/\/form(\/[^/]+)?(\/)?$/, "");
  const normalizedBase = basePath.length > 0 ? basePath : "/";
  const actionTrimmed = actionUrl.replace(/^\/+/, "");

  return `${normalizedBase.replace(/\/+$/, "")}/${actionTrimmed}`;
};
