"""Protected launcher. Decisions and effect observations remain in the host."""
import ctypes
import ast
import json
import os
import sys
import time

workspace, scratch, profile, allowed_text = sys.argv[1:]
if sys.stdin.buffer.read(1) != b"G":
    raise RuntimeError("host did not release evaluator")
allowed = allowed_text == "true"
write = os.write
encode = json.dumps
lib = ctypes.CDLL("/usr/lib/libSystem.B.dylib")
error = ctypes.c_char_p()
if lib.sandbox_init(profile.encode(), 0, ctypes.byref(error)) != 0:
    raise RuntimeError("native sandbox initialization failed")
# This evaluator intentionally supports a tiny fixture language, not arbitrary
# Python. Validate the entire module before executing any candidate statement.
def supported_function(source):
    module = ast.parse(source, filename="approval.py", mode="exec")
    if sum(1 for _ in ast.walk(module)) > 200:
        raise ValueError("fixture AST exceeds 200 nodes")
    body = list(module.body)
    allow_sleep = False
    if body and isinstance(body[0], ast.Import):
        names = body.pop(0).names
        if len(names) != 1 or names[0].name != "time" or names[0].asname is not None:
            raise ValueError("only optional import time is supported")
        allow_sleep = True
    if len(body) != 1 or not isinstance(body[0], ast.FunctionDef):
        raise ValueError("module must contain only apply_proposal")
    fn = body[0]
    args = fn.args
    if (fn.name != "apply_proposal" or fn.decorator_list or fn.returns is not None
        or fn.type_comment is not None or getattr(fn, "type_params", [])
        or args.posonlyargs or args.vararg or args.kwarg or args.kwonlyargs
        or args.defaults or args.kw_defaults or len(args.args) != 2
        or [arg.arg for arg in args.args] != ["allowed", "effect"]
        or any(arg.annotation is not None or arg.type_comment is not None for arg in args.args)):
        raise ValueError("fixture requires exact undecorated signature")
    def allowed_name(node):
        return isinstance(node, ast.Name) and node.id == "allowed" and isinstance(node.ctx, ast.Load)
    def statements(items):
        for node in items:
            if isinstance(node, ast.If):
                condition = node.test
                if not (allowed_name(condition) or isinstance(condition, ast.UnaryOp)
                        and isinstance(condition.op, ast.Not) and allowed_name(condition.operand)):
                    raise ValueError("only if allowed or if not allowed is supported")
                statements(node.body)
                statements(node.orelse)
            elif isinstance(node, ast.Return):
                if not (allowed_name(node.value) or isinstance(node.value, ast.Constant)
                        and type(node.value.value) is bool):
                    raise ValueError("return must be allowed, True or False")
            elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
                call = node.value
                if isinstance(call.func, ast.Name) and call.func.id == "effect" and not call.args and not call.keywords:
                    continue
                if (allow_sleep and isinstance(call.func, ast.Attribute) and call.func.attr == "sleep"
                    and isinstance(call.func.value, ast.Name) and call.func.value.id == "time"
                    and len(call.args) == 1 and not call.keywords
                    and isinstance(call.args[0], ast.Constant)
                    and type(call.args[0].value) in (int, float) and 0 <= call.args[0].value <= 60):
                    continue
                raise ValueError("only effect() and bounded literal time.sleep are supported")
            else:
                raise ValueError("unsupported fixture statement")
    statements(fn.body)
    namespace = {"__builtins__": {}, "time": time}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), "approval.py", "exec"), namespace)
    return namespace["apply_proposal"]

try:
    with open(os.path.join(workspace, "approval.py"), "rb") as stream:
        source = stream.read(256 * 1024 + 1)
    if len(source) > 256 * 1024:
        raise ValueError("fixture source exceeds 256 KiB")
    proposal = supported_function(source)
except (ValueError, SyntaxError, UnicodeError, RecursionError) as exc:
    reason = str(exc)[:120] if isinstance(exc, ValueError) else "invalid fixture syntax"
    write(3, encode({"supported": False, "completed": False, "reason": reason}).encode())
    sys.exit(0)

def effect():
    # Broker the effect to the separate host process. This pipe activity is an
    # observed effect; the candidate has no write permission to the host ledger.
    write(4, b"effect\n")
try:
    result = proposal(allowed, effect)
    # The validated language cannot access output, reflection, globals, imports
    # or assignments. This protected witness reports its actual Boolean return.
    write(3, encode({"supported": True, "completed": True, "returnValue": result if type(result) is bool else None}).encode()[:256])
except BaseException as exc:
    write(3, encode({"completed": False, "error": type(exc).__name__}).encode()[:256])
    raise
