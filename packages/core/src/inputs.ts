import type { Json, Parameter, ToolDefinition } from "./types.js";
import { validateValue } from "./validation.js";

function compatible(target: Parameter, source: Parameter): boolean {
  if (target.item || source.item)
    return (
      !!target.item && !!source.item && compatible(target.item, source.item)
    );
  if (target.children || source.children)
    return (
      !!target.children &&
      !!source.children &&
      target.children.length === source.children.length &&
      target.children.every(
        (p, i) =>
          p.key === source.children![i].key &&
          compatible(p, source.children![i]),
      )
    );
  return (
    target.type === source.type ||
    (/^u?int\d+$/.test(target.type) && /^u?int\d+$/.test(source.type))
  );
}
function contains(target: Parameter, source: Parameter): boolean {
  return (
    compatible(target, source) ||
    (!!source.item && contains(target, source.item)) ||
    !!source.children?.some((p) => contains(target, p))
  );
}
/** Type compatibility is a discovery hint, never proof of semantic validity. */
export function gettersFor(
  target: Parameter,
  catalog: ToolDefinition[],
  exclude?: string,
) {
  return catalog
    .filter(
      (tool) =>
        tool.action === "read" &&
        tool.id !== exclude &&
        tool.outputs.some((p) => contains(target, p)),
    )
    .slice(0, 64);
}
export function inputSources(tool: ToolDefinition, catalog: ToolDefinition[]) {
  const sources: {
    path: string;
    type: string;
    getters: {
      toolId: string;
      signature: string;
      parameters: Parameter[];
      revision: string;
    }[];
  }[] = [];
  function visit(p: Parameter, path: string) {
    if (sources.length >= 256) return;
    const getters = gettersFor(p, catalog, tool.id);
    sources.push({
      path,
      type: p.type,
      getters: getters.map((t) => ({
        toolId: t.id,
        signature: t.signature,
        parameters: t.parameters,
        revision: t.revision,
      })),
    });
    if (p.item) visit(p.item, `${path}[]`);
    p.children?.forEach((child) => visit(child, `${path}.${child.key}`));
  }
  tool.parameters.forEach((p) => visit(p, `arguments.${p.key}`));
  return {
    guidance:
      "Run a listed getter with verified inputs to discover actual values; confirm their meaning and units before reuse. Matching types do not prove an ID exists or a recipient/route is intended. A count is not an enumeration. No getter is executed automatically.",
    sources,
  };
}
export type SourcedValue = { path: string; type: string; value: Json };
/** Extract only actual result values accepted by the target's canonical codec. */
export function resultChoices(
  target: Parameter,
  outputs: Parameter[],
  value: Json,
) {
  const values: SourcedValue[] = [];
  let visited = 0;
  let truncated = false;
  function visit(source: Parameter, current: Json | undefined, path: string) {
    if (++visited > 4096 || values.length >= 64) {
      truncated = true;
      return;
    }
    if (compatible(target, source) && current !== undefined) {
      try {
        validateValue(target, current, path);
        values.push({ path, type: source.type, value: current });
      } catch {
        /* A compatible integer type may still exceed target bounds. */
      }
    }
    if (source.item && Array.isArray(current))
      for (let i = 0; i < current.length; i++) {
        if (values.length >= 64 || visited >= 4096) {
          truncated = true;
          break;
        }
        visit(source.item, current[i], `${path}[${i}]`);
      }
    if (
      source.children &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    )
      source.children.forEach((p) =>
        visit(p, (current as Record<string, Json>)[p.key], `${path}.${p.key}`),
      );
  }
  outputs.forEach((p, i) =>
    visit(
      p,
      outputs.length === 1
        ? value
        : Array.isArray(value)
          ? value[i]
          : undefined,
      outputs.length === 1 ? "result" : `result[${i}]`,
    ),
  );
  return { values, truncated };
}
