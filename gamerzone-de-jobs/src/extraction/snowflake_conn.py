import os
from pathlib import Path

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from dotenv import load_dotenv


load_dotenv()

# ============================================================
# Configuration
# ============================================================

SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE")

SNOWFLAKE_PRIVATE_KEY_PATH = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE = (
    os.getenv("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE") or None
)

SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "GAMERZONE_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "GAMERZONE")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "RAW")


# ============================================================
# Key-pair auth
# ============================================================

def _load_private_key_der() -> bytes:

    if not SNOWFLAKE_PRIVATE_KEY_PATH:
        raise ValueError(
            "SNOWFLAKE_PRIVATE_KEY_PATH must be present in .env"
        )

    key_path = Path(SNOWFLAKE_PRIVATE_KEY_PATH)

    if not key_path.exists():
        raise FileNotFoundError(
            f"Snowflake private key not found at {key_path}"
        )

    passphrase = (
        SNOWFLAKE_PRIVATE_KEY_PASSPHRASE.encode()
        if SNOWFLAKE_PRIVATE_KEY_PASSPHRASE
        else None
    )

    with open(key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=passphrase,
            backend=default_backend(),
        )

    return private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


# ============================================================
# Connection
# ============================================================

def get_snowflake_connection(
    *,
    use_warehouse: bool = True,
    use_database: bool = True,
) -> snowflake.connector.SnowflakeConnection:
    """
    Connect to Snowflake using key-pair auth.

    use_warehouse/use_database are False during first-time setup,
    before the warehouse/database/schema exist yet.
    """

    if not SNOWFLAKE_ACCOUNT or not SNOWFLAKE_USER or not SNOWFLAKE_ROLE:
        raise ValueError(
            "SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_ROLE "
            "must be present in .env"
        )

    connect_kwargs = {
        "account": SNOWFLAKE_ACCOUNT,
        "user": SNOWFLAKE_USER,
        "private_key": _load_private_key_der(),
        "role": SNOWFLAKE_ROLE,
    }

    if use_warehouse:
        connect_kwargs["warehouse"] = SNOWFLAKE_WAREHOUSE

    if use_database:
        connect_kwargs["database"] = SNOWFLAKE_DATABASE
        connect_kwargs["schema"] = SNOWFLAKE_SCHEMA

    return snowflake.connector.connect(**connect_kwargs)
