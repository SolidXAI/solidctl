import { FilterRule, FilterRuleType } from "../components/core/common/FilterComponent";
import { createSolidEntityApi } from "../redux/api/solidEntityApi";
import { kebabCase } from "change-case";
import { getSession } from "../adapters/auth/index";
import { env } from "../adapters/env";
import { solidGet } from "../http/solidHttp";


interface RelationHydrationBucket {
  meta: any;
  rules: FilterRule[];
  ids: Set<number>;
}

const API_URL = env("NEXT_PUBLIC_BACKEND_API_URL");

export async function hydrateRelationRules(
  rootRules: FilterRule[],
  viewData: any
): Promise<FilterRule[]> {
  const relationMap = new Map<string, RelationHydrationBucket>();

  // 1️⃣ Collect all relation rules
  const walk = (rule: FilterRule): void => {
    if (rule.type === FilterRuleType.RULE && rule.fieldName) {
      const meta =
        viewData?.data?.solidFieldsMetadata?.[rule.fieldName];

      if (
        meta?.type === "relation" &&
        meta.relationType === "many-to-many" &&
        Array.isArray(rule.value) &&
        typeof rule.value[0] === "number"
      ) {
        if (!relationMap.has(rule.fieldName)) {
          relationMap.set(rule.fieldName, {
            meta,
            rules: [],
            ids: new Set<number>()
          });
        }

        const bucket = relationMap.get(rule.fieldName)!;
        (rule.value as number[]).forEach(id => bucket.ids.add(id));
        bucket.rules.push(rule);
      }
    }

    if (Array.isArray(rule.children)) {
      rule.children.forEach(walk);
    }
  };

  rootRules.forEach(walk);

  // 2️⃣ Fetch & hydrate per relation field (ARRAY SAFE)
  const buckets = Array.from(relationMap.values());

  const session: any = await getSession();
  const token = session?.user?.accessToken;

  if (!token) {
    console.error("hydrateRelationRules: Not authenticated");
    return rootRules;
  }


  for (const bucket of buckets) {
    const { meta, rules, ids } = bucket;

    if (
      !meta.relationCoModelSingularName ||
      !meta.relationModel?.userKeyField?.name
    ) {
      continue;
    }

    // const { useLazyGetSolidEntitiesQuery } = entityApi;
    // const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

    // const response = await triggerGetSolidEntities({
    //   filters: { id: { $in: Array.from(ids) } },
    //   limit: 100
    // });
    const kebabEntityName = kebabCase(meta.relationCoModelSingularName);

    const resp = await solidGet(`${API_URL}/api/${kebabEntityName}`,
      {
        params: {
          offset: 0,
          limit: 100,
          filters: {
            id: { $in: Array.from(ids) },
          },
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const records = resp?.data?.data?.records ?? [];

    const labelField = meta.relationModel.userKeyField.name;

    const idToLabel = new Map<number, string>(
      records.map((item: any) => [
        item.id,
        item[labelField]
      ])
    );

    // 3️⃣ Replace numeric IDs with { label, value }
    rules.forEach((rule: FilterRule) => {
      rule.value = (rule.value as number[]).map(id => ({
        label: idToLabel.get(id) ?? String(id),
        value: id
      }));
    });
  }

  return rootRules;
}
