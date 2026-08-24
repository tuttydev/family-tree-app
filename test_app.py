import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ["DATABASE_URL"] = f"sqlite:///{(ROOT / 'test_family_tree.db').as_posix()}"

from fastapi.testclient import TestClient
import main

def test_core_flow(client):
    assert client.get("/health").status_code == 200
    a = client.post("/persons", json={"first_name":"Ada","last_name":"Test","gender":"Female"})
    b = client.post("/persons", json={"first_name":"Bola","last_name":"Test","gender":"Male"})
    assert a.status_code == 200 and b.status_code == 200
    parent_id, child_id = a.json()["id"], b.json()["id"]
    rel = client.post("/relationships/parent", json={"parent_id": parent_id, "child_id": child_id})
    assert rel.status_code == 200
    duplicate = client.post("/relationships/parent", json={"parent_id": parent_id, "child_id": child_id})
    assert duplicate.status_code == 409
    tree = client.get("/family-tree")
    assert tree.status_code == 200
    assert len(tree.json()["persons"]) == 2


if __name__ == "__main__":
    with TestClient(main.app) as client:
        test_core_flow(client)
    print("FamilyTree backend smoke test passed.")
