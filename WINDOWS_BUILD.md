# FamilyTree Windows Release

## Build the executable

Run `build_windows.bat` on a **Windows machine** with Python 3.10+ installed.

Output:
`dist\FamilyTree.exe`

## Build the installer

Install Inno Setup on Windows, then compile `FamilyTree.iss`.

Output:
`installer\FamilyTree-Setup.exe`

## Persistent user data

The application stores its database and uploads in:

`%LOCALAPPDATA%\FamilyTree\`

This prevents application updates from deleting family data or photographs.

## Important

Build PyInstaller on Windows. A normal Linux PyInstaller build produces a Linux executable and cannot be used as a Windows `.exe`.
