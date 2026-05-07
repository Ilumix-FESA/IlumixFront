# limpeza_db.py — rode uma vez para limpar o banco
from pymongo import MongoClient

CONN = "mongodb+srv://RaissaBespalec:lyeLKntd7OXlKJEo@cluster-ilumix.zckcsrn.mongodb.net/?appName=Cluster-Ilumix"
client = MongoClient(CONN)
db = client["Ilumix_db"]

print("=== ANTES ===")
print("Coleções:", db.list_collection_names())
for col in db.list_collection_names():
    print(f"  [{col}] {db[col].count_documents({})} docs")

# 1. Remove a coleção duplicada Users (maiúscula) — criada pelo script de teste
if "Users" in db.list_collection_names():
    db.drop_collection("Users")
    print("\n✅ Coleção 'Users' (maiúscula/duplicada) removida")

# 2. Remove o usuário de teste da coleção correta 'users'
result = db["users"].delete_many({"email": "teste@ilumix.com"})
if result.deleted_count:
    print(f"✅ Usuário de teste removido ({result.deleted_count} doc)")
else:
    print("ℹ️  Nenhum usuário de teste em 'users' (estava limpo)")

print("\n=== DEPOIS ===")
print("Coleções:", db.list_collection_names())
for col in db.list_collection_names():
    print(f"  [{col}] {db[col].count_documents({})} docs")

# 3. Mostra a estrutura real de usuários (sem senha)
print("\n=== Usuários reais em 'users' ===")
for u in db["users"].find({}, {"password_hash": 0, "refresh_token": 0}):
    print(dict(u))

# 4. Mostra os commands reais das lâmpadas
print("\n=== Commands da 1ª lâmpada ===")
lamp = db["lamps"].find_one()
if lamp:
    for cmd in lamp.get("Commands", []):
        print(f"  CommandId={cmd['CommandId']}  Name={cmd['Name']}  AttributeRef={cmd['AttributeRef']}")
    print("\n=== Attributes da 1ª lâmpada ===")
    for attr in lamp.get("Attributes", []):
        print(f"  Atributo_Id={attr['Atributo_Id']}  Name={attr['Name']}  Value={attr['Value']}")
