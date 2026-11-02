# Agent Permissions & Execution Policy

## Full Command Execution Access
Agents operating in this workspace (Antigravity, Gemini, etc.) have full authorization and access to autonomously execute any terminal, shell, build, and test command inside the project directory without requiring prior manual confirmation:

- **Testing & Verification**: Run `pytest`, `python`, and test runners across all test suites.
- **Version Control**: Run `git` commands (`status`, `diff`, `log`, `grep`, `branch`, etc.).
- **Code & Repository Operations**: Search, inspect, analyze, and format project files.
- **Package & Dependency Checks**: Inspect dependencies, manifests, and configurations.

## Scope & Policy
- **Policy**: `always-proceed` (unrestricted autonomous execution within the project directory).
- **Working Directory**: Restricted to the project directory workspace (`ha-inventer-e16`).
- **Safety**: Do not delete critical git history or external files outside this repository.

