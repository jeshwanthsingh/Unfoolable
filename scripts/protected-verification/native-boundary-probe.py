"""Test-only native boundary probe; no production recipe or route invokes it."""
import ctypes
import json
import os
import socket
import sys
from pathlib import Path

workspace, scratch, profile, control, bundle = sys.argv[1:]
if sys.stdin.buffer.read(1) != b"G":
    raise RuntimeError("host did not release probe")
lib = ctypes.CDLL("/usr/lib/libSystem.B.dylib")
error = ctypes.c_char_p()
if lib.sandbox_init(profile.encode(), 0, ctypes.byref(error)) != 0:
    raise RuntimeError("native sandbox initialization failed")
checks = {
    "control_read": lambda: Path(control).read_text(),
    "control_write": lambda: Path(control).write_text("bad"),
    "driver_write": lambda: Path(bundle, "denial-driver.py").write_text("bad"),
    "host_write": lambda: Path(bundle, "host-oracle.txt").write_text("bad"),
    "workspace_write": lambda: Path(workspace, "approval.py").write_text("bad"),
    "network": lambda: socket.create_connection(("127.0.0.1", 9), 0.1),
    "signal": lambda: os.kill(os.getppid(), 0),
    "fork": lambda: os.fork(),
    "exec": lambda: os.execl("/usr/local/bin/python3", "python3", "-c", "print(1)"),
}
blocked = {}
for name, action in checks.items():
    try:
        value = action()
        if name == "fork" and value == 0:
            os._exit(125)
        blocked[name] = False
    except PermissionError:
        blocked[name] = True
os.write(3, json.dumps(blocked).encode())
