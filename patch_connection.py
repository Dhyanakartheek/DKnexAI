import os

def patch_file(path, target, replacement):
    with open(path, 'r') as f:
        content = f.read()
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Patched {path}")
    else:
        print(f"Target not found in {path}")

# Patch AgentService.java
patch_file(
    r'c:\Users\karth\Desktop\DKnexAI\BACKEND\src\main\java\com\dknex\ai\service\AgentService.java',
    'private final String PYTHON_SERVICE_URL = "http://localhost:5000/run-agent";',
    'private final String PYTHON_SERVICE_URL = "http://localhost:8000/run-agent";'
)
patch_file(
    r'c:\Users\karth\Desktop\DKnexAI\BACKEND\src\main\java\com\dknex\ai\service\AgentService.java',
    'request.put("input", input);',
    'request.put("input", input);\n        request.put("agent_type", agent.getType());'
)

# Patch AgentController.java
patch_file(
    r'c:\Users\karth\Desktop\DKnexAI\BACKEND\src\main\java\com\dknex\ai\controller\AgentController.java',
    '@RestController',
    '@CrossOrigin(origins = "*", maxAge = 3600)\n@RestController'
)
