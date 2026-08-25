# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules


ROOT = Path(SPEC).parent
BACKEND = ROOT / "backend"


hiddenimports = []

for package in (
    "uvicorn",
    "fastapi",
    "starlette",
    "pydantic",
    "sqlalchemy",
    "multipart",
):
    hiddenimports += collect_submodules(package)


# Only package the application frontend.
# Do NOT package backend/seed_uploads.
datas = [
    (str(BACKEND / "static"), "static"),
]


a = Analysis(
    [str(ROOT / "launcher.py")],
    pathex=[
        str(ROOT),
        str(BACKEND),
    ],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter"],
    noarchive=False,
)


pyz = PYZ(a.pure)


exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="FamilyTree",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
)