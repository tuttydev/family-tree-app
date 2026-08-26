#define MyAppName "FamilyTree"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "ALASI OLATUNDE"
#define MyAppExeName "FamilyTree.exe"

[Setup]
AppId={{B8F2A5D4-7E3A-4E51-A4C8-FAMILYTREE2026}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}

DefaultDirName={localappdata}Programs\FamilyTree
DefaultGroupName=FamilyTree

OutputDir=C:\family_tree_app\installer
OutputBaseFilename=FamilyTree-v{#MyAppVersion}-Setup

Compression=lzma
SolidCompression=yes

WizardStyle=modern

PrivilegesRequired=lowest

ArchitecturesInstallIn64BitMode=x64compatible

UninstallDisplayName=FamilyTree
UninstallDisplayIcon={app}\{#MyAppExeName}

DisableProgramGroupPage=yes

[Files]
Source: "C:\family_tree_app\FamilyTree-v2.0.0-Windows\FamilyTree.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\FamilyTree"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\FamilyTree"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall FamilyTree"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch FamilyTree"; Flags: nowait postinstall skipifsilent

[Dirs]
Name: "{localappdata}\FamilyTree"
Name: "{localappdata}\FamilyTree\uploads"

[UninstallDelete]
Type: dirifempty; Name: "{localappdata}\FamilyTree\uploads"
Type: dirifempty; Name: "{localappdata}\FamilyTree"