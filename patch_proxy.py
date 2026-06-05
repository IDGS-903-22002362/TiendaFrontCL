with open("src/app/api/productos/[[...path]]/route.ts", "r") as f:
    content = f.read()

import re

def should_require_auth_replace(match):
    return """function shouldRequireAuth(method: string, path?: string[]) {
  if (path && path[0] === "admin") {
    return true; // Force auth for admin endpoints even if GET
  }
  return method !== "GET";
}

function forward(request: NextRequest, path?: string[]) {
  const suffix = getSuffix(path);

  return proxyToBackend({
    request,
    backendPath: `/api/productos${suffix}`,
    requireAuth: shouldRequireAuth(request.method, path),
  });
}"""

content = re.sub(r'function shouldRequireAuth[\s\S]*?\}\s*function forward\(request: NextRequest, path\?: string\[\]\) \{[\s\S]*?\}\s*', should_require_auth_replace, content)

# Enable PATCH method proxying too
new_methods = """
export function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return context.params.then((params) => forward(request, params.path));
}
"""

content += new_methods

with open("src/app/api/productos/[[...path]]/route.ts", "w") as f:
    f.write(content)
