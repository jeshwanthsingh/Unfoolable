"""Parse only. Never import or execute the proposed test. Narrow reproduction admission."""
import ast, json, sys
try:
    source = sys.stdin.read(65537)
    if len(source.encode()) > 65536: raise ValueError("Test exceeds byte limit")
    tree = ast.parse(source)
    forbidden = (ast.If, ast.IfExp, ast.Try, ast.TryStar, ast.Return, ast.Raise, ast.For, ast.AsyncFor, ast.While, ast.Match, ast.Lambda, ast.BoolOp, ast.Yield, ast.YieldFrom, ast.Await, ast.NamedExpr, ast.Global, ast.Nonlocal)
    if any(isinstance(n, forbidden) for n in ast.walk(tree)): raise ValueError("Conditional execution, swallowed failures or early exit is not a locked reproduction")
    functions = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
    if len(functions) != 1 or not functions[0].name.startswith("test_") or functions[0].decorator_list: raise ValueError("Use one undecorated native test, with no helper functions")
    if any(not isinstance(n, (ast.Import, ast.ImportFrom, ast.ClassDef)) for n in tree.body): raise ValueError("No executable module-level setup")
    banned = {"eval", "exec", "compile", "getattr", "setattr", "delattr", "globals", "locals", "vars", "exit", "quit", "__import__", "open"}
    for n in ast.walk(tree):
        if isinstance(n, ast.Attribute) and (n.attr.startswith("_") or n.attr in {"read_text", "read_bytes", "skip", "skipTest", "expectedFailure", "mock", "addSuccess", "wasSuccessful"}): raise ValueError("Source introspection, skips or framework changes are not admitted")
        if isinstance(n, ast.Name) and (n.id in banned or n.id.startswith("__")): raise ValueError("Dynamic execution/introspection is not admitted")
        if isinstance(n, ast.ImportFrom) and (n.module or "").split(".")[0] in {"sys", "inspect", "builtins", "gc", "ctypes", "signal", "importlib"}: raise ValueError("Execution machinery is not admitted")
        if isinstance(n, ast.Import) and any(a.name.split(".")[0] in {"sys", "inspect", "builtins", "gc", "ctypes", "signal", "importlib"} for a in n.names): raise ValueError("Execution machinery is not admitted")
    print(json.dumps({"allowed": True}))
except (SyntaxError, ValueError) as error:
    print(json.dumps({"allowed": False, "reason": str(error)}))
