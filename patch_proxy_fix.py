with open("src/app/api/productos/[[...path]]/route.ts", "r") as f:
    content = f.read()

import re

# Use regex to find the duplicate requireAuth and trailing characters
content = re.sub(r'\}, path\),\n  \}\);\n\}\`,\n    requireAuth: shouldRequireAuth\(request\.method\),\n  \}\);\n\}', '}, path),\n  });\n}', content)

with open("src/app/api/productos/[[...path]]/route.ts", "w") as f:
    f.write(content)
