import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from io import BytesIO
from pathlib import Path

import psycopg2
import requests
from PIL import Image


MAX_WIDTH_PX = 1200
JPEG_QUALITY = 75
TIMEOUT_SECONDS = 20
MAX_RETRIES = 3
RETRY_DELAY_SEC = 2
BASE_SUBFOLDER = "entity_images"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
    )
}


def get_backend_root() -> Path:
    return Path(__file__).resolve().parent.parent


def get_api_root() -> Path:
    return get_backend_root() / "TuristickiVodic.API"


def get_default_wwwroot() -> Path:
    return get_api_root() / "wwwroot"


def get_default_publish_root() -> Path:
    return get_backend_root() / "publish"


def get_default_log_path() -> Path:
    return get_backend_root() / "tools" / "sync_local_images.log"


def log(message: str, log_path: Path) -> None:
    print(message)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(message + "\n")


def read_connection_string(environment: str) -> str | None:
    env_value = os.getenv("IMAGE_MIGRATION_CONNECTION")
    if env_value:
        return env_value

    appsettings_name = (
        "appsettings.Production.json"
        if environment.lower() == "production"
        else "appsettings.Development.json"
    )
    config_path = get_api_root() / appsettings_name
    if not config_path.exists():
        return None

    with config_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    return data.get("ConnectionStrings", {}).get("DefaultConnection")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download remote Images rows, compress them locally, and update DB URLs."
    )
    parser.add_argument(
        "--environment",
        choices=["development", "production"],
        default="development",
        help="Which appsettings file to use if no explicit connection string is provided.",
    )
    parser.add_argument(
        "--connection-string",
        help="Override database connection string. If omitted, appsettings or IMAGE_MIGRATION_CONNECTION is used.",
    )
    parser.add_argument(
        "--wwwroot",
        default=str(get_default_wwwroot()),
        help="Target wwwroot folder where images/entity_images will be created.",
    )
    parser.add_argument(
        "--copy-to-publish",
        action="store_true",
        help="Copy generated images into backend publish/wwwroot after sync.",
    )
    parser.add_argument(
        "--publish-root",
        default=str(get_default_publish_root()),
        help="Publish root used with --copy-to-publish.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit for quick test runs.",
    )
    return parser.parse_args()


def fix_one_main_image_trigger(conn, log_path: Path) -> None:
    sql = """
    CREATE OR REPLACE FUNCTION ensure_one_main_image()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW."IsMain" = true THEN
            IF NEW."ObjectId" IS NOT NULL THEN
                UPDATE "Images"
                SET "IsMain" = false
                WHERE "ObjectId" = NEW."ObjectId"
                  AND "Id" <> NEW."Id";

            ELSIF NEW."ActivityId" IS NOT NULL THEN
                UPDATE "Images"
                SET "IsMain" = false
                WHERE "ActivityId" = NEW."ActivityId"
                  AND "Id" <> NEW."Id";

            ELSIF NEW."EventId" IS NOT NULL THEN
                UPDATE "Images"
                SET "IsMain" = false
                WHERE "EventId" = NEW."EventId"
                  AND "Id" <> NEW."Id";

            ELSIF NEW."DestinationId" IS NOT NULL THEN
                UPDATE "Images"
                SET "IsMain" = false
                WHERE "DestinationId" = NEW."DestinationId"
                  AND "Id" <> NEW."Id";

            ELSIF NEW."LocalityId" IS NOT NULL THEN
                UPDATE "Images"
                SET "IsMain" = false
                WHERE "LocalityId" = NEW."LocalityId"
                  AND "Id" <> NEW."Id";
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """

    with conn.cursor() as cursor:
        cursor.execute(sql)
    conn.commit()
    log("Updated ensure_one_main_image() trigger function.", log_path)


def fetch_remote_image_rows(conn, limit: int) -> list[dict]:
    sql = """
        SELECT "Id", "Url", "ObjectId", "ActivityId", "EventId", "DestinationId", "LocalityId"
        FROM public."Images"
        WHERE "Url" LIKE 'http%'
        ORDER BY "Id"
    """
    if limit > 0:
        sql += f" LIMIT {int(limit)}"

    with conn.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    columns = [
        "id",
        "url",
        "object_id",
        "activity_id",
        "event_id",
        "destination_id",
        "locality_id",
    ]
    return [dict(zip(columns, row)) for row in rows]


def infer_subfolder(row: dict) -> str:
    if row["destination_id"] is not None:
        return "destinations"
    if row["locality_id"] is not None:
        return "localities"
    if row["event_id"] is not None:
        return "events"
    if row["activity_id"] is not None:
        return "activities"
    if row["object_id"] is not None:
        return "objects"
    return "misc"


def download_image(session: requests.Session, url: str, log_path: Path) -> bytes | None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
            if response.status_code == 200:
                return response.content
            log(
                f"    HTTP {response.status_code} for {url} (attempt {attempt}/{MAX_RETRIES})",
                log_path,
            )
        except requests.exceptions.Timeout:
            log(f"    Timeout for {url} (attempt {attempt}/{MAX_RETRIES})", log_path)
        except requests.exceptions.ConnectionError:
            log(f"    Connection error for {url} (attempt {attempt}/{MAX_RETRIES})", log_path)
        except Exception as exc:
            log(f"    Download error for {url}: {exc}", log_path)

        if attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY_SEC)

    return None


def compress_and_save(image_bytes: bytes, save_path: Path) -> bool:
    img = Image.open(BytesIO(image_bytes))

    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        mask = img.split()[-1] if img.mode in ("RGBA", "LA") else None
        background.paste(img, mask=mask)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    if img.width > MAX_WIDTH_PX:
        new_height = int(img.height * MAX_WIDTH_PX / img.width)
        img = img.resize((MAX_WIDTH_PX, new_height), Image.LANCZOS)

    img.save(save_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return True


def local_path_for_url(wwwroot: Path, subfolder: str, remote_url: str) -> tuple[Path, str]:
    digest = hashlib.sha1(remote_url.encode("utf-8")).hexdigest()[:24]
    file_name = f"{digest}.jpg"
    relative_url = f"/images/{BASE_SUBFOLDER}/{subfolder}/{file_name}"
    absolute_path = wwwroot / "images" / BASE_SUBFOLDER / subfolder / file_name
    return absolute_path, relative_url


def ensure_local_image(
    session: requests.Session,
    wwwroot: Path,
    subfolder: str,
    remote_url: str,
    log_path: Path,
) -> str | None:
    absolute_path, relative_url = local_path_for_url(wwwroot, subfolder, remote_url)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)

    if absolute_path.exists() and absolute_path.stat().st_size > 0:
        return relative_url

    image_bytes = download_image(session, remote_url, log_path)
    if image_bytes is None:
        return None

    try:
        compress_and_save(image_bytes, absolute_path)
        return relative_url
    except Exception as exc:
        log(f"    Compression error for {remote_url}: {exc}", log_path)
        if absolute_path.exists():
            absolute_path.unlink()
        return None


def update_image_url(conn, image_id: int, relative_url: str) -> None:
    with conn.cursor() as cursor:
        cursor.execute(
            'UPDATE public."Images" SET "Url" = %s WHERE "Id" = %s',
            (relative_url, image_id),
        )


def copy_images_to_publish(wwwroot: Path, publish_root: Path, log_path: Path) -> None:
    source = wwwroot / "images" / BASE_SUBFOLDER
    target = publish_root / "wwwroot" / "images" / BASE_SUBFOLDER

    if not source.exists():
        log("No generated images were found to copy to publish.", log_path)
        return

    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True)
    log(f"Copied generated images to {target}", log_path)


def main() -> int:
    args = parse_args()
    log_path = get_default_log_path()
    log_path.write_text("", encoding="utf-8")

    connection_string = args.connection_string or read_connection_string(args.environment)
    if not connection_string:
        print(
            "No connection string found. Use --connection-string or set IMAGE_MIGRATION_CONNECTION."
        )
        return 1

    wwwroot = Path(args.wwwroot).resolve()
    publish_root = Path(args.publish_root).resolve()

    log("=" * 60, log_path)
    log("SYNC LOCAL IMAGES", log_path)
    log(f"Environment   : {args.environment}", log_path)
    log(f"wwwroot       : {wwwroot}", log_path)
    log(f"copy publish  : {args.copy_to_publish}", log_path)
    log("=" * 60, log_path)

    session = requests.Session()
    downloaded = 0
    reused = 0
    updated = 0
    failed = 0

    conn = psycopg2.connect(connection_string)
    try:
        fix_one_main_image_trigger(conn, log_path)
        rows = fetch_remote_image_rows(conn, args.limit)
        log(f"Remote image rows in DB: {len(rows)}", log_path)

        for index, row in enumerate(rows, start=1):
            subfolder = infer_subfolder(row)
            absolute_path, expected_relative_url = local_path_for_url(
                wwwroot, subfolder, row["url"]
            )
            existed_before = absolute_path.exists() and absolute_path.stat().st_size > 0

            log(
                f"[{index}/{len(rows)}] ID={row['id']} {subfolder} | {row['url'][:110]}",
                log_path,
            )

            relative_url = ensure_local_image(
                session, wwwroot, subfolder, row["url"], log_path
            )
            if relative_url is None:
                failed += 1
                continue

            if existed_before:
                reused += 1
            else:
                downloaded += 1

            try:
                update_image_url(conn, row["id"], expected_relative_url)
                conn.commit()
                updated += 1
            except Exception as exc:
                conn.rollback()
                failed += 1
                log(f"    DB update failed for ID={row['id']}: {exc}", log_path)

        if args.copy_to_publish:
            copy_images_to_publish(wwwroot, publish_root, log_path)

        log("", log_path)
        log("=" * 60, log_path)
        log("DONE", log_path)
        log(f"Downloaded new files : {downloaded}", log_path)
        log(f"Reused existing files: {reused}", log_path)
        log(f"DB rows updated      : {updated}", log_path)
        log(f"Failed               : {failed}", log_path)
        log(f"Log file             : {log_path}", log_path)
        log("=" * 60, log_path)
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
