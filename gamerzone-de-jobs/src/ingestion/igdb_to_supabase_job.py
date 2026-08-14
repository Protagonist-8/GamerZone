import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()

# ============================================================
# Configuration
# ============================================================

TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")

SUPABASE_PROJECT_URL = os.getenv("SUPABASE_PROJECT_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")

AUTH_URL = "https://id.twitch.tv/oauth2/token"
IGDB_URL = "https://api.igdb.com/v4"

SUPPORTED_PLATFORM_IDS = {
    6,    # PC
    12,   # Xbox 360
    41,   # Wii U
    48,   # PlayStation 4
    167,  # PlayStation 5
}

PLATFORM_FAMILIES = {
    6: "PC",
    12: "Xbox",
    41: "Nintendo",
    48: "PlayStation",
    167: "PlayStation",
}

# Single source of truth for price tiers, shared with the frontend's
# /deals page. Lives inside gamerzone-frontend so it always deploys
# with the Vercel app; this job reaches across the repo to read it.
VARS_JSON_PATH = (
    Path(__file__).resolve().parents[3]
    / "gamerzone-frontend"
    / "config"
    / "vars.json"
)


def load_price_tiers() -> dict[str, list[int]]:

    if not VARS_JSON_PATH.exists():
        raise FileNotFoundError(
            f"vars.json not found at {VARS_JSON_PATH}"
        )

    with open(VARS_JSON_PATH, encoding="utf-8") as file:
        data = json.load(file)

    price_tiers = data.get("platform_price_tiers")

    if not price_tiers:
        raise ValueError(
            "vars.json is missing 'platform_price_tiers'"
        )

    return price_tiers


# ============================================================
# Supabase
# ============================================================

def get_supabase_client() -> Client:
    if not SUPABASE_PROJECT_URL or not SUPABASE_API_KEY:
        raise ValueError(
            "SUPABASE_PROJECT_URL and SUPABASE_API_KEY "
            "must be present in .env"
        )

    return create_client(
        SUPABASE_PROJECT_URL,
        SUPABASE_API_KEY,
    )


# ============================================================
# IGDB Authentication
# ============================================================

def get_access_token() -> str:

    if not TWITCH_CLIENT_ID or not TWITCH_CLIENT_SECRET:
        raise ValueError(
            "TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET "
            "must be present in .env"
        )

    response = requests.post(
        AUTH_URL,
        params={
            "client_id": TWITCH_CLIENT_ID,
            "client_secret": TWITCH_CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
        timeout=30,
    )

    response.raise_for_status()

    return response.json()["access_token"]


# ============================================================
# IGDB API
# ============================================================

def igdb_request(
    endpoint: str,
    query: str,
    access_token: str,
) -> list[dict[str, Any]]:

    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {access_token}",
    }

    response = requests.post(
        f"{IGDB_URL}/{endpoint}",
        headers=headers,
        data=query,
        timeout=30,
    )

    response.raise_for_status()

    return response.json()


def fetch_games(
    access_token: str,
    target_count: int = 100,
    batch_size: int = 50,
) -> list[dict[str, Any]]:

    games_by_id = {}
    offset = 0

    while len(games_by_id) < target_count:

        print(
            f"Fetching IGDB games "
            f"(offset={offset}, batch_size={batch_size})..."
        )

        query = f"""
            fields
                id,
                name,
                first_release_date,
                summary,
                platforms.id,
                platforms.name,
                platforms.abbreviation,
                cover.id,
                cover.image_id,
                cover.url;

            where
                platforms != null
                & platforms.id = ({",".join(
                    str(platform_id)
                    for platform_id in SUPPORTED_PLATFORM_IDS
                )});

            sort id asc;

            limit {batch_size};
            offset {offset};
        """

        batch = igdb_request(
            endpoint="games",
            query=query,
            access_token=access_token,
        )

        if not batch:
            print("IGDB returned no more games.")
            break

        for game in batch:

            game_id = game["id"]

            if game_id not in games_by_id:
                games_by_id[game_id] = game

                if len(games_by_id) >= target_count:
                    break

        offset += batch_size

        print(
            f"Collected {len(games_by_id)}/"
            f"{target_count} unique games."
        )

    games = list(games_by_id.values())

    print(f"\nFinal game count: {len(games)}")

    return games


# ============================================================
# Transformation
# ============================================================

def transform_games(
    games: list[dict[str, Any]],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:

    game_rows = []
    console_rows = []
    game_console_rows = []

    seen_consoles = set()
    seen_relationships = set()

    for game in games:

        game_id = game["id"]

        supported_platforms = [
            platform
            for platform in game.get("platforms", [])
            if platform["id"] in SUPPORTED_PLATFORM_IDS
        ]

        if not supported_platforms:
            continue

        # Release year
        first_release_date = game.get("first_release_date")

        release_year = None

        if first_release_date:
            release_year = datetime.fromtimestamp(
                first_release_date
            ).year

        # Cover
        cover = game.get("cover")

        image_id = None
        image_url = None

        if cover:

            image_id = cover.get("image_id")
            image_url = cover.get("url")

            if image_url:

                if image_url.startswith("//"):
                    image_url = f"https:{image_url}"

                elif image_url.startswith("http://"):
                    image_url = image_url.replace(
                        "http://",
                        "https://",
                        1,
                    )

        game_rows.append(
            {
                "source_game_id": game_id,
                "game_name": game.get("name"),
                "release_year": release_year,
                "description": game.get("summary"),
                "image_id": image_id,
                "image_url": image_url,
            }
        )

        # Platforms
        for platform in supported_platforms:

            platform_id = platform["id"]

            if platform_id not in seen_consoles:

                console_rows.append(
                    {
                        "source_platform_id": platform_id,
                        "console_name": platform.get("name"),
                        "abbreviation": platform.get(
                            "abbreviation"
                        ),
                    }
                )

                seen_consoles.add(platform_id)

            relationship_key = (
                game_id,
                platform_id,
            )

            if relationship_key not in seen_relationships:

                game_console_rows.append(
                    {
                        "source_game_id": game_id,
                        "source_platform_id": platform_id,
                    }
                )

                seen_relationships.add(
                    relationship_key
                )

    return (
        game_rows,
        console_rows,
        game_console_rows,
    )


# ============================================================
# Validation
# ============================================================

def validate_transformed_data(
    game_rows: list[dict[str, Any]],
    console_rows: list[dict[str, Any]],
    game_console_rows: list[dict[str, Any]],
) -> None:

    print("\n========== VALIDATION ==========")

    errors = []

    game_ids = [
        row["source_game_id"]
        for row in game_rows
    ]

    if len(game_ids) != len(set(game_ids)):
        errors.append(
            "Duplicate source_game_id found"
        )

    for row in game_rows:

        for field in [
            "source_game_id",
            "game_name",
        ]:

            if not row.get(field):
                errors.append(
                    f"Missing {field}: {row}"
                )

    console_ids = [
        row["source_platform_id"]
        for row in console_rows
    ]

    if len(console_ids) != len(set(console_ids)):
        errors.append(
            "Duplicate source_platform_id found"
        )

    relationship_keys = [
        (
            row["source_game_id"],
            row["source_platform_id"],
        )
        for row in game_console_rows
    ]

    if len(relationship_keys) != len(
        set(relationship_keys)
    ):
        errors.append(
            "Duplicate game-console relationship found"
        )

    valid_game_ids = set(game_ids)
    valid_console_ids = set(console_ids)

    for row in game_console_rows:

        if row["source_game_id"] not in valid_game_ids:
            errors.append(
                f"Unknown game in relationship: {row}"
            )

        if row["source_platform_id"] not in valid_console_ids:
            errors.append(
                f"Unknown console in relationship: {row}"
            )

    if errors:

        print("❌ VALIDATION FAILED")

        for error in errors:
            print(f"- {error}")

        raise ValueError(
            f"Validation failed with {len(errors)} error(s)."
        )

    print("✅ Transformation validation passed")


# ============================================================
# Supabase Upserts
# ============================================================

def upsert_consoles(
    supabase: Client,
    console_rows: list[dict[str, Any]],
) -> dict[int, Any]:

    print("\nUpserting consoles...")

    response = (
        supabase
        .table("consoles")
        .upsert(
            console_rows,
            on_conflict="source_platform_id",
        )
        .execute()
    )

    console_map = {
        row["source_platform_id"]: row["console_id"]
        for row in response.data
    }

    print(
        f"✅ Upserted {len(response.data)} consoles"
    )

    return console_map


def upsert_games(
    supabase: Client,
    game_rows: list[dict[str, Any]],
) -> dict[int, Any]:

    print("\nUpserting games...")

    response = (
        supabase
        .table("games")
        .upsert(
            game_rows,
            on_conflict="source_game_id",
        )
        .execute()
    )

    game_map = {
        row["source_game_id"]: row["game_id"]
        for row in response.data
    }

    print(
        f"✅ Upserted {len(response.data)} games"
    )

    return game_map


def upsert_game_consoles(
    supabase: Client,
    game_console_rows: list[dict[str, Any]],
    game_map: dict[int, Any],
    console_map: dict[int, Any],
) -> None:

    print("\nUpserting game-console relationships...")

    rows = []

    for relationship in game_console_rows:

        rows.append(
            {
                "game_id": game_map[
                    relationship["source_game_id"]
                ],
                "console_id": console_map[
                    relationship["source_platform_id"]
                ],
            }
        )

    response = (
        supabase
        .table("game_consoles")
        .upsert(
            rows,
            on_conflict="game_id,console_id",
        )
        .execute()
    )

    print(
        f"✅ Upserted "
        f"{len(response.data)} game-console relationships"
    )


def upsert_game_prices(
    supabase: Client,
    game_console_rows: list[dict[str, Any]],
    game_map: dict[int, Any],
    console_map: dict[int, Any],
    console_rows: list[dict[str, Any]],
) -> None:

    print("\nGenerating game prices...")

    price_tiers = load_price_tiers()

    platform_name_by_id = {
        row["source_platform_id"]: row["console_name"]
        for row in console_rows
    }

    price_rows = []

    for relationship in game_console_rows:

        source_game_id = relationship[
            "source_game_id"
        ]

        source_platform_id = relationship[
            "source_platform_id"
        ]

        console_name = platform_name_by_id[
            source_platform_id
        ]

        price_options = price_tiers.get(
            console_name
        )

        if not price_options:
            raise ValueError(
                f"No price configuration for "
                f"{console_name}"
            )

        price = random.choice(price_options)

        price_rows.append(
            {
                "game_id": game_map[source_game_id],
                "console_id": console_map[
                    source_platform_id
                ],
                "price": price,
            }
        )

    print(
        f"Generated prices for "
        f"{len(price_rows)} game-console combinations"
    )

    response = (
        supabase
        .table("game_prices")
        .upsert(
            price_rows,
            on_conflict="game_id,console_id",
        )
        .execute()
    )

    print(
        f"✅ Upserted {len(response.data)} game prices"
    )


# ============================================================
# Main
# ============================================================

def main() -> None:

    # -------------------------
    # IGDB
    # -------------------------

    print("Authenticating with IGDB...")

    access_token = get_access_token()

    games = fetch_games(
        access_token=access_token,
        target_count=100,
        batch_size=50,
    )

    (
        game_rows,
        console_rows,
        game_console_rows,
    ) = transform_games(games)

    validate_transformed_data(
        game_rows,
        console_rows,
        game_console_rows,
    )

    # -------------------------
    # Supabase
    # -------------------------

    print("\nConnecting to Supabase...")

    supabase = get_supabase_client()

    print("✅ Supabase client created")

    # -------------------------
    # Load
    # -------------------------

    console_map = upsert_consoles(
        supabase,
        console_rows,
    )

    game_map = upsert_games(
        supabase,
        game_rows,
    )

    upsert_game_consoles(
        supabase,
        game_console_rows,
        game_map,
        console_map,
    )

    upsert_game_prices(
        supabase,
        game_console_rows,
        game_map,
        console_map,
        console_rows,
    )

    print("\n========== LOAD COMPLETE ==========")
    print(f"Games loaded: {len(game_map)}")
    print(f"Consoles loaded: {len(console_map)}")
    print(
        f"Relationships loaded: "
        f"{len(game_console_rows)}"
    )


if __name__ == "__main__":
    main()