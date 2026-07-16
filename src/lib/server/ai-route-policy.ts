const DYNAMIC_ID = ":id";
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

type RouteRule = {
  pattern: readonly string[];
  methods: readonly string[];
};

const ROUTES: readonly RouteRule[] = [
  { pattern: ["chat", "sessions"], methods: ["GET", "POST"] },
  { pattern: ["chat", "sessions", DYNAMIC_ID], methods: ["GET"] },
  { pattern: ["chat", "messages"], methods: ["POST"] },
  { pattern: ["files", "upload"], methods: ["POST"] },
  { pattern: ["files", DYNAMIC_ID], methods: ["DELETE"] },
  { pattern: ["tryon", "jobs"], methods: ["GET", "POST"] },
  { pattern: ["tryon", "jobs", DYNAMIC_ID], methods: ["GET"] },
  { pattern: ["tryon", "jobs", DYNAMIC_ID, "image"], methods: ["GET"] },
  { pattern: ["tryon", "jobs", DYNAMIC_ID, "download"], methods: ["GET"] },
  { pattern: ["admin", "metrics"], methods: ["GET"] },
  { pattern: ["admin", "jobs"], methods: ["GET"] },
];

function matches(pattern: readonly string[], path: readonly string[]) {
  return pattern.length === path.length && pattern.every((segment, index) =>
    segment === DYNAMIC_ID
      ? SAFE_ID.test(path[index] ?? "")
      : segment === path[index],
  );
}

export function evaluateAiRoute(method: string, path?: readonly string[]) {
  const rule = path ? ROUTES.find((candidate) => matches(candidate.pattern, path)) : undefined;
  if (!rule) return { status: 404 as const };
  if (!rule.methods.includes(method)) {
    return { status: 405 as const, allow: rule.methods.join(", ") };
  }
  return { status: 200 as const };
}
