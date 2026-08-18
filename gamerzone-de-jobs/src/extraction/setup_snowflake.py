"""
One-time Snowflake setup: creates the warehouse, database, RAW schema,
and RAW landing tables (one per Supabase source table).

Run this once before the recurring batch job (supabase_to_snowflake_job.py).
Safe to re-run — every statement is IF NOT EXISTS.
"""

from snowflake_conn import (
    SNOWFLAKE_DATABASE,
    SNOWFLAKE_SCHEMA,
    SNOWFLAKE_WAREHOUSE,
    get_snowflake_connection,
)


# ============================================================
# DDL
# ============================================================

CREATE_WAREHOUSE = f"""
CREATE WAREHOUSE IF NOT EXISTS {SNOWFLAKE_WAREHOUSE}
    WAREHOUSE_SIZE = 'XSMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    INITIALLY_SUSPENDED = TRUE
"""

CREATE_DATABASE = f"""
CREATE DATABASE IF NOT EXISTS {SNOWFLAKE_DATABASE}
"""

CREATE_SCHEMA = f"""
CREATE SCHEMA IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_SCHEMA}
"""

# One CREATE TABLE per Supabase source table. Columns mirror the
# Postgres schema exactly, plus a trailing _loaded_at column that
# marks when each row landed in Snowflake (this is what makes RAW
# append-only/history-preserving instead of a truncate-overwrite copy).

CREATE_TABLE_STATEMENTS = {

    "CONSOLES": """
        CREATE TABLE IF NOT EXISTS CONSOLES (
            console_id          NUMBER        NOT NULL,
            source_platform_id  NUMBER        NOT NULL,
            console_name        VARCHAR       NOT NULL,
            abbreviation        VARCHAR,
            created_at          TIMESTAMP_TZ  NOT NULL,
            updated_at          TIMESTAMP_TZ  NOT NULL,
            _loaded_at          TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "GAMES": """
        CREATE TABLE IF NOT EXISTS GAMES (
            game_id         NUMBER        NOT NULL,
            source_game_id  NUMBER        NOT NULL,
            game_name       VARCHAR       NOT NULL,
            release_year    NUMBER,
            description     VARCHAR,
            image_id        VARCHAR,
            image_url       VARCHAR,
            created_at      TIMESTAMP_TZ  NOT NULL,
            updated_at      TIMESTAMP_TZ  NOT NULL,
            _loaded_at      TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "GAME_CONSOLES": """
        CREATE TABLE IF NOT EXISTS GAME_CONSOLES (
            game_id     NUMBER        NOT NULL,
            console_id  NUMBER        NOT NULL,
            created_at  TIMESTAMP_TZ  NOT NULL,
            updated_at  TIMESTAMP_TZ  NOT NULL,
            _loaded_at  TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "GAME_PRICES": """
        CREATE TABLE IF NOT EXISTS GAME_PRICES (
            game_id     NUMBER        NOT NULL,
            console_id  NUMBER        NOT NULL,
            price       NUMBER(10,2)  NOT NULL,
            created_at  TIMESTAMP_TZ  NOT NULL,
            updated_at  TIMESTAMP_TZ  NOT NULL,
            _loaded_at  TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "USERS": """
        CREATE TABLE IF NOT EXISTS USERS (
            user_id     VARCHAR       NOT NULL,
            name        VARCHAR,
            email       VARCHAR       NOT NULL,
            created_at  TIMESTAMP_TZ  NOT NULL,
            updated_at  TIMESTAMP_TZ  NOT NULL,
            _loaded_at  TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "ORDERS": """
        CREATE TABLE IF NOT EXISTS ORDERS (
            order_id      NUMBER        NOT NULL,
            user_id       VARCHAR       NOT NULL,
            order_date    TIMESTAMP_TZ  NOT NULL,
            total_amount  NUMBER(10,2)  NOT NULL,
            status        VARCHAR       NOT NULL,
            created_at    TIMESTAMP_TZ  NOT NULL,
            updated_at    TIMESTAMP_TZ  NOT NULL,
            _loaded_at    TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "ORDER_ITEMS": """
        CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
            order_item_id  NUMBER        NOT NULL,
            order_id       NUMBER        NOT NULL,
            game_id        NUMBER        NOT NULL,
            console_id     NUMBER        NOT NULL,
            quantity       NUMBER        NOT NULL,
            unit_price     NUMBER(10,2)  NOT NULL,
            created_at     TIMESTAMP_TZ  NOT NULL,
            updated_at     TIMESTAMP_TZ  NOT NULL,
            _loaded_at     TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

    "PAYMENTS": """
        CREATE TABLE IF NOT EXISTS PAYMENTS (
            payment_id             NUMBER        NOT NULL,
            order_id               NUMBER        NOT NULL,
            payment_type           VARCHAR       NOT NULL,
            payment_status         VARCHAR       NOT NULL,
            amount                 NUMBER(10,2)  NOT NULL,
            transaction_reference  VARCHAR,
            payment_date           TIMESTAMP_TZ,
            created_at             TIMESTAMP_TZ  NOT NULL,
            updated_at             TIMESTAMP_TZ  NOT NULL,
            _loaded_at             TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
        )
    """,

}


# ============================================================
# Main
# ============================================================

def main() -> None:

    print(f"Connecting to Snowflake account (setup mode)...")

    conn = get_snowflake_connection(
        use_warehouse=False,
        use_database=False,
    )

    try:
        cursor = conn.cursor()

        print(f"Creating warehouse {SNOWFLAKE_WAREHOUSE}...")
        cursor.execute(CREATE_WAREHOUSE)

        print(f"Creating database {SNOWFLAKE_DATABASE}...")
        cursor.execute(CREATE_DATABASE)

        print(f"Creating schema {SNOWFLAKE_SCHEMA}...")
        cursor.execute(CREATE_SCHEMA)

        cursor.execute(f"USE WAREHOUSE {SNOWFLAKE_WAREHOUSE}")
        cursor.execute(f"USE DATABASE {SNOWFLAKE_DATABASE}")
        cursor.execute(f"USE SCHEMA {SNOWFLAKE_SCHEMA}")

        for table_name, ddl in CREATE_TABLE_STATEMENTS.items():
            print(f"Creating table {SNOWFLAKE_SCHEMA}.{table_name}...")
            cursor.execute(ddl)

        print("\n✅ Snowflake setup complete:")
        print(f"   Warehouse: {SNOWFLAKE_WAREHOUSE}")
        print(f"   Database:  {SNOWFLAKE_DATABASE}")
        print(f"   Schema:    {SNOWFLAKE_SCHEMA}")
        print(f"   Tables:    {', '.join(CREATE_TABLE_STATEMENTS.keys())}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
