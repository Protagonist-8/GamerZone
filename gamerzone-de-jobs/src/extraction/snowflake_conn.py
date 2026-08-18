import os

import snowflake.connector
from dotenv import load_dotenv


load_dotenv()

# ============================================================
# Configuration
# ============================================================

SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE")

# Programmatic Access Token (PAT) — used directly as the password.
# PATs expire (max 365 days, often shorter per account policy) and
# must be rotated manually in Snowsight before expiry; see CLAUDE.md §13.
SNOWFLAKE_PAT = os.getenv("SNOWFLAKE_PAT")

SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "GAMERZONE_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "GAMERZONE")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "RAW")


# ============================================================
# Connection
# ============================================================

def get_snowflake_connection(
    *,
    use_warehouse: bool = True,
    use_database: bool = True,
) -> snowflake.connector.SnowflakeConnection:
    """
    Connect to Snowflake using a Programmatic Access Token (PAT),
    passed as the password.

    use_warehouse/use_database are False during first-time setup,
    before the warehouse/database/schema exist yet.
    """

    if not SNOWFLAKE_ACCOUNT or not SNOWFLAKE_USER or not SNOWFLAKE_ROLE:
        raise ValueError(
            "SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_ROLE "
            "must be present in .env"
        )

    if not SNOWFLAKE_PAT:
        raise ValueError(
            "SNOWFLAKE_PAT must be present in .env"
        )

    connect_kwargs = {
        "account": SNOWFLAKE_ACCOUNT,
        "user": SNOWFLAKE_USER,
        "password": SNOWFLAKE_PAT,
        "role": SNOWFLAKE_ROLE,
    }

    if use_warehouse:
        connect_kwargs["warehouse"] = SNOWFLAKE_WAREHOUSE

    if use_database:
        connect_kwargs["database"] = SNOWFLAKE_DATABASE
        connect_kwargs["schema"] = SNOWFLAKE_SCHEMA

    return snowflake.connector.connect(**connect_kwargs)
