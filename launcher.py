import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path


# ---------------------------------------------------------
# PyInstaller / Windows GUI executable fix
# Uvicorn expects stdout/stderr to exist and support isatty().
# When packaged with --windowed, they can be None.
# ---------------------------------------------------------
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")

if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")


import uvicorn


HOST = "127.0.0.1"
PORT = 8001
URL = f"http://{HOST}:{PORT}"


def configure_environment():
    if sys.platform == "win32":
        root = (
            Path(
                os.getenv(
                    "LOCALAPPDATA",
                    Path.home() / "AppData" / "Local"
                )
            )
            / "FamilyTree"
        )
    else:
        root = Path.home() / ".local" / "share" / "FamilyTree"

    root.mkdir(parents=True, exist_ok=True)

    os.environ.setdefault(
        "FAMILYTREE_DATA_DIR",
        str(root)
    )


def wait_for_server(timeout=30):
    deadline = time.time() + timeout

    while time.time() < deadline:
        try:
            with socket.create_connection(
                (HOST, PORT),
                timeout=0.5
            ):
                return True

        except OSError:
            time.sleep(0.25)

    return False


def main():
    configure_environment()

    from backend.main import app

    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=HOST,
            port=PORT,
            log_level="warning",
            access_log=False,
        )
    )

    thread = threading.Thread(
        target=server.run,
        daemon=True
    )

    thread.start()

    if wait_for_server():
        webbrowser.open(URL)

    try:
        while thread.is_alive():
            thread.join(0.5)

    except KeyboardInterrupt:
        server.should_exit = True
        thread.join(timeout=5)


if __name__ == "__main__":
    main()