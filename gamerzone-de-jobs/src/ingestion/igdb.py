import os
from datetime import datetime
from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv()

TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")

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
    target_count: int = 150,
    batch_size: int = 50,
) -> list[dict[str, Any]]:
    """
    Fetch the first `target_count` unique games that have
    at least one supported platform.

    IGDB pagination is handled using offset.
    """

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

    print(
        f"\nFinal game count: {len(games)}"
    )

    return games


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

        first_release_date = game.get("first_release_date")

        release_year = None

        if first_release_date:
            release_year = datetime.fromtimestamp(
                first_release_date
            ).year

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

        for platform in supported_platforms:

            platform_id = platform["id"]

            if platform_id not in seen_consoles:

                console_rows.append(
                    {
                        "source_platform_id": platform_id,
                        "console_name": platform.get("name"),
                        "abbreviation": platform.get("abbreviation"),
                        "platform_family": PLATFORM_FAMILIES[
                            platform_id
                        ],
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


def validate_transformed_data(
    game_rows: list[dict[str, Any]],
    console_rows: list[dict[str, Any]],
    game_console_rows: list[dict[str, Any]],
) -> None:

    print("\n========== VALIDATION ==========")

    errors = []

    # Games
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

    # Consoles
    console_ids = [
        row["source_platform_id"]
        for row in console_rows
    ]

    if len(console_ids) != len(set(console_ids)):
        errors.append(
            "Duplicate source_platform_id found"
        )

    # Relationships
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

    print("✅ Games validation passed")
    print("✅ Consoles validation passed")
    print("✅ Game-console validation passed")
    print("✅ No duplicate keys found")
    print("✅ All relationships are valid")


def print_summary(
    game_rows: list[dict[str, Any]],
    console_rows: list[dict[str, Any]],
    game_console_rows: list[dict[str, Any]],
) -> None:

    print("\n========== SUMMARY ==========")

    print(f"Games: {len(game_rows)}")
    print(f"Consoles: {len(console_rows)}")
    print(
        f"Game-console relationships: "
        f"{len(game_console_rows)}"
    )

    print("\n========== CONSOLES ==========")

    for console in console_rows:
        print(
            f"{console['source_platform_id']} | "
            f"{console['console_name']} | "
            f"{console['platform_family']}"
        )


def main() -> None:

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

    print_summary(
        game_rows,
        console_rows,
        game_console_rows,
    )


if __name__ == "__main__":
    main()