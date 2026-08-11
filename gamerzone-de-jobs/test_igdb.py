import os

import requests
from dotenv import load_dotenv


load_dotenv()

client_id = os.getenv("TWITCH_CLIENT_ID")
client_secret = os.getenv("TWITCH_CLIENT_SECRET")


# Get access token
token_response = requests.post(
    "https://id.twitch.tv/oauth2/token",
    params={
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    },
)

token_response.raise_for_status()
access_token = token_response.json()["access_token"]

headers = {
    "Client-ID": client_id,
    "Authorization": f"Bearer {access_token}",
}


# Get one game
game_response = requests.post(
    "https://api.igdb.com/v4/games",
    headers=headers,
    data="""
        fields
            id,
            name,
            platforms,
            cover;
        limit 1;
    """,
)

game_response.raise_for_status()
game = game_response.json()[0]

print("GAME:")
print(game)


# Get platform details
if game.get("platforms"):
    platform_ids = ",".join(map(str, game["platforms"]))

    platform_response = requests.post(
        "https://api.igdb.com/v4/platforms",
        headers=headers,
        data=f"""
            fields
                id,
                name,
                abbreviation,
                platform_family;
            where id = ({platform_ids});
        """,
    )

    platform_response.raise_for_status()

    print("\nPLATFORMS:")
    for platform in platform_response.json():
        print(platform)


# Get cover details
if game.get("cover"):
    cover_response = requests.post(
        "https://api.igdb.com/v4/covers",
        headers=headers,
        data=f"""
            fields
                id,
                image_id,
                url;
            where id = {game["cover"]};
        """,
    )

    cover_response.raise_for_status()

    print("\nCOVER:")
    for cover in cover_response.json():
        print(cover)