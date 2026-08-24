#define MyAppName "FamilyTree"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "ALASI OLATUNDE"
#define MyAppExeName "FamilyTree.exe"

[Setup]
AppId={{7A1D7F5E-9C62-4E6C-B7A5-3B7A4F4D6E21}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\FamilyTree
DefaultGroupName=FamilyTree
OutputDir=installer
OutputBaseFilename=FamilyTree-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}

[Files]
Source: "dist\FamilyTree.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\FamilyTree"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\FamilyTree"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch FamilyTree"; Flags: nowait postinstall skipifsilent
