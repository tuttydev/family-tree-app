from getpass import getpass

from pwdlib import PasswordHash

from database import SessionLocal
from models import User, Role, Permission, user_roles, role_permissions


password_hasher = PasswordHash.recommended()


PERMISSIONS = {
    "members.view": "View family members",
    "members.create": "Create family members",
    "members.edit": "Edit family members",
    "members.delete": "Delete family members",

    "relationships.view": "View family relationships",
    "relationships.create": "Create family relationships",
    "relationships.edit": "Edit family relationships",
    "relationships.delete": "Delete family relationships",

    "gallery.view": "View family gallery",
    "gallery.upload": "Upload gallery photos",
    "gallery.delete": "Delete gallery photos",

    "forum.view": "View family forum",
    "forum.create": "Create forum posts",
    "forum.edit": "Edit forum posts",
    "forum.delete": "Delete forum posts",
    "forum.moderate": "Moderate forum content",

    "events.view": "View family events",
    "events.create": "Create family events",
    "events.edit": "Edit family events",
    "events.delete": "Delete family events",

    "users.view": "View users",
    "users.create": "Create users",
    "users.edit": "Edit users",
    "users.delete": "Delete users",

    "roles.view": "View roles and permissions",
    "roles.manage": "Manage roles and permissions",

    "settings.view": "View application settings",
    "settings.manage": "Manage application settings",

    "audit_logs.view": "View audit logs",

    "backup.create": "Create database backups",
    "backup.restore": "Restore database backups",
}


def main():
    db = SessionLocal()

    try:
        print("=" * 60)
        print("FamilyTree - Super Administrator Setup")
        print("=" * 60)

        username = input("Choose Super Admin username: ").strip()
        display_name = input("Display name [ALASI OLATUNDE]: ").strip()
        email = input("Email (optional): ").strip()

        if not display_name:
            display_name = "ALASI OLATUNDE"

        if not username:
            print("Username cannot be empty.")
            return

        existing = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

        if existing:
            print(f"Username '{username}' already exists.")
            return

        password = getpass("Choose password: ")
        password_confirm = getpass("Confirm password: ")

        if not password:
            print("Password cannot be empty.")
            return

        if password != password_confirm:
            print("Passwords do not match.")
            return

        # --------------------------------------------------------
        # Create permissions
        # --------------------------------------------------------

        permissions = {}

        for code, description in PERMISSIONS.items():
            permission = (
                db.query(Permission)
                .filter(Permission.code == code)
                .first()
            )

            if not permission:
                permission = Permission(
                    code=code,
                    description=description,
                )
                db.add(permission)
                db.flush()

            permissions[code] = permission

        # --------------------------------------------------------
        # Create Super Administrator role
        # --------------------------------------------------------

        role = (
            db.query(Role)
            .filter(Role.name == "Super Administrator")
            .first()
        )

        if not role:
            role = Role(
                name="Super Administrator",
                description="Full unrestricted access to FamilyTree.",
                is_system_role=True,
            )
            db.add(role)
            db.flush()

        # Give Super Administrator every permission
        for permission in permissions.values():
            exists = db.execute(
                role_permissions.select().where(
                    role_permissions.c.role_id == role.id,
                    role_permissions.c.permission_id == permission.id,
                )
            ).first()

            if not exists:
                db.execute(
                    role_permissions.insert().values(
                        role_id=role.id,
                        permission_id=permission.id,
                    )
                )

        # --------------------------------------------------------
        # Create Super Administrator user
        # --------------------------------------------------------

        user = User(
            username=username,
            email=email or None,
            password_hash=password_hasher.hash(password),
            display_name=display_name,
            is_active=True,
            is_super_admin=True,
        )

        db.add(user)
        db.flush()

        # Assign Super Administrator role
        db.execute(
            user_roles.insert().values(
                user_id=user.id,
                role_id=role.id,
            )
        )

        db.commit()

        print()
        print("=" * 60)
        print("SUPER ADMINISTRATOR CREATED SUCCESSFULLY")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Display name: {display_name}")
        print(f"Super Admin: YES")
        print(f"Permissions: {len(permissions)}")
        print("=" * 60)

    except Exception as exc:
        db.rollback()
        print()
        print("ERROR:", exc)

    finally:
        db.close()


if __name__ == "__main__":
    main()