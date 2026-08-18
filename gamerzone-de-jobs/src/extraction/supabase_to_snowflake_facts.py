import logging
import os
import uuid
from datetime import datetime, timezone

import pandas as pd
import snowflake.connector
from dotenv import load_dotenv
from snowflake.connector.pandas_tools import write_pandas
from supabase import Client, create_client


# ============================================================
# Configuration
# ============================================================

load_dotenv()

SUPABASE_PROJECT_URL = os.environ["SUPABASE_PROJECT_URL"]
SUPABASE_API_KEY = os.environ["SUPABASE_API_KEY"]

SNOWFLAKE_ACCOUNT = os.environ["SNOWFLAKE_ACCOUNT"]
SNOWFLAKE_USER = os.environ["SNOWFLAKE_USER"]
SNOWFLAKE_ROLE = os.environ["SNOWFLAKE_ROLE"]
SNOWFLAKE_PAT = os.environ["SNOWFLAKE_PAT"]

SNOWFLAKE_WAREHOUSE = "COMPUTE_WH"
SNOWFLAKE_DATABASE = "GAMERZONE"
SNOWFLAKE_SCHEMA = "RAW"

PAGE_SIZE = 1000

FACT_TABLES = [
    "USERS",
    "ORDERS",
    "ORDER_ITEMS",
    "PAYMENTS",
]


# ============================================================
# Logging
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)


# ============================================================
# Clients
# ============================================================

def create_supabase_client() -> Client:
    logger.info("Connecting to Supabase")

    return create_client(
        SUPABASE_PROJECT_URL,
        SUPABASE_API_KEY,
    )


def create_snowflake_connection():
    logger.info("Connecting to Snowflake")

    return snowflake.connector.connect(
        account=SNOWFLAKE_ACCOUNT,
        user=SNOWFLAKE_USER,
        password=SNOWFLAKE_PAT,
        role=SNOWFLAKE_ROLE,
        warehouse=SNOWFLAKE_WAREHOUSE,
        database=SNOWFLAKE_DATABASE,
        schema=SNOWFLAKE_SCHEMA,
        session_parameters={
            "QUERY_TAG": "GAMERZONE_FACT_INGESTION",
        },
    )


# ============================================================
# Supabase Extraction
# ============================================================

def extract_table(
    supabase: Client,
    table_name: str,
) -> pd.DataFrame:

    logger.info(
        "Extracting %s from Supabase",
        table_name,
    )

    rows = []
    offset = 0

    while True:

        response = (
            supabase
            .table(table_name.lower())
            .select("*")
            .range(
                offset,
                offset + PAGE_SIZE - 1,
            )
            .execute()
        )

        batch = response.data

        if not batch:
            break

        rows.extend(batch)

        logger.info(
            "%s: extracted %d rows",
            table_name,
            len(rows),
        )

        if len(batch) < PAGE_SIZE:
            break

        offset += PAGE_SIZE

    dataframe = pd.DataFrame(rows)

    logger.info(
        "%s: extraction complete — %d rows",
        table_name,
        len(dataframe),
    )

    return dataframe


# ============================================================
# Prepare Data
# ============================================================

def prepare_dataframe(
    dataframe: pd.DataFrame,
    ingestion_id: str,
) -> pd.DataFrame:

    if dataframe.empty:
        return dataframe

    dataframe = dataframe.copy()

    # Snowflake generates _loaded_at automatically.
    dataframe["_ingestion_id"] = ingestion_id

    return dataframe


# ============================================================
# Load to Snowflake
# ============================================================

def load_table(
    conn,
    dataframe: pd.DataFrame,
    table_name: str,
):

    if dataframe.empty:
        logger.info(
            "%s: source table is empty — nothing to load",
            table_name,
        )
        return

    logger.info(
        "%s: loading %d rows into Snowflake",
        table_name,
        len(dataframe),
    )

    success, nchunks, nrows, output = write_pandas(
        conn=conn,
        df=dataframe,
        table_name=table_name,
        database=SNOWFLAKE_DATABASE,
        schema=SNOWFLAKE_SCHEMA,
        auto_create_table=False,
        overwrite=False,
        quote_identifiers=False,
    )

    if not success:
        raise RuntimeError(
            f"Snowflake load failed for {table_name}"
        )

    logger.info(
        "%s: successfully loaded %d rows in %d chunk(s)",
        table_name,
        nrows,
        nchunks,
    )


# ============================================================
# Main
# ============================================================

def main():

    start_time = datetime.now(timezone.utc)

    # One ID for the entire fact extraction run.
    ingestion_id = (
        datetime.now(timezone.utc)
        .strftime("%Y%m%dT%H%M%SZ")
        + "_FACT_"
        + uuid.uuid4().hex[:8]
    )

    logger.info("=" * 70)
    logger.info("Starting GamerZone fact ingestion")
    logger.info("Ingestion ID: %s", ingestion_id)
    logger.info("=" * 70)

    supabase = create_supabase_client()

    conn = None

    try:

        conn = create_snowflake_connection()

        for table_name in FACT_TABLES:

            logger.info("-" * 70)

            dataframe = extract_table(
                supabase,
                table_name,
            )

            dataframe = prepare_dataframe(
                dataframe,
                ingestion_id,
            )

            load_table(
                conn,
                dataframe,
                table_name,
            )

        logger.info("=" * 70)
        logger.info(
            "Fact ingestion completed successfully"
        )
        logger.info(
            "Ingestion ID: %s",
            ingestion_id,
        )
        logger.info("=" * 70)

    except Exception:

        logger.exception(
            "Fact ingestion failed"
        )

        raise

    finally:

        if conn:
            conn.close()

    duration = (
        datetime.now(timezone.utc) - start_time
    )

    logger.info(
        "Total runtime: %s",
        duration,
    )


if __name__ == "__main__":
    main()