from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
from io import BytesIO
from pathlib import Path

try:
    import psycopg2
except ImportError:  # pragma: no cover - optional for seed-only mode
    psycopg2 = None

try:
    import requests
except ImportError:  # pragma: no cover - handled at runtime
    requests = None

try:
    from PIL import Image
except ImportError:  # pragma: no cover - handled at runtime
    Image = None


MAX_WIDTH_PX = 1200
JPEG_QUALITY = 75
TIMEOUT_SECONDS = 20
MAX_RETRIES = 1
RETRY_DELAY_SEC = 2
BASE_SUBFOLDER = "entity_images"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
    )
}

SOURCE_START_RE = re.compile(r'^\s*WITH source\("Url"')
IMAGE_INSERT_RE = re.compile(r'INSERT INTO "Images"\s*\(([^)]*)\)')
HTTP_URL_LITERAL_RE = re.compile(r"'(https?://[^'\r\n]+)'")


def get_repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def get_backend_root() -> Path:
    return Path(__file__).resolve().parent.parent


def get_api_root() -> Path:
    return get_backend_root() / "TuristickiVodic.API"


def get_default_wwwroot() -> Path:
    return get_api_root() / "wwwroot"


def get_default_publish_root() -> Path:
    return get_backend_root() / "publish"


def get_default_seed_path() -> Path:
    return get_repo_root() / "baza" / "seed.sql"


def get_default_log_path() -> Path:
    return get_backend_root() / "tools" / "sync_local_images.log"


def get_default_remaining_report_path() -> Path:
    return get_backend_root() / "tools" / "remaining_seed_image_urls.txt"


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
        description=(
            "Download remote Images URLs, compress them locally, and update DB rows and/or seed.sql "
            "to use local /images/entity_images paths."
        )
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
        help="Optional limit for quick test runs. Applies independently to DB rows and seed URLs.",
    )
    parser.add_argument(
        "--update-seed",
        action="store_true",
        help="Also rewrite image URLs inside seed.sql to local /images/entity_images paths.",
    )
    parser.add_argument(
        "--seed-file",
        default=str(get_default_seed_path()),
        help="Path to seed.sql used with --update-seed.",
    )
    parser.add_argument(
        "--skip-db",
        action="store_true",
        help="Only sync files and seed.sql. Do not connect to the database.",
    )
    parser.add_argument(
        "--remaining-report",
        default=str(get_default_remaining_report_path()),
        help="Where to write the list of still-remote seed image URLs after the run.",
    )
    return parser.parse_args()


def validate_runtime(args: argparse.Namespace) -> tuple[bool, list[str]]:
    missing: list[str] = []

    if requests is None:
        missing.append("requests")
    if Image is None:
        missing.append("pillow")
    if not args.skip_db and psycopg2 is None:
        missing.append("psycopg2-binary")

    return (len(missing) == 0, missing)


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


def infer_subfolder_from_columns(columns: str) -> str:
    normalized = columns.lower()
    if '"destinationid"' in normalized:
        return "destinations"
    if '"localityid"' in normalized:
        return "localities"
    if '"eventid"' in normalized:
        return "events"
    if '"activityid"' in normalized:
        return "activities"
    if '"objectid"' in normalized:
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
) -> tuple[str | None, bool]:
    absolute_path, relative_url = local_path_for_url(wwwroot, subfolder, remote_url)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)

    existed_before = absolute_path.exists() and absolute_path.stat().st_size > 0
    if existed_before:
        return relative_url, True

    image_bytes = download_image(session, remote_url, log_path)
    if image_bytes is None:
        return None, False

    try:
        compress_and_save(image_bytes, absolute_path)
        return relative_url, False
    except Exception as exc:
        log(f"    Compression error for {remote_url}: {exc}", log_path)
        if absolute_path.exists():
            absolute_path.unlink()
        return None, False


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


def process_remote_image(
    session: requests.Session,
    wwwroot: Path,
    subfolder: str,
    remote_url: str,
    log_path: Path,
) -> tuple[str | None, bool]:
    return ensure_local_image(session, wwwroot, subfolder, remote_url, log_path)


def sync_database_images(
    conn,
    session: requests.Session,
    wwwroot: Path,
    log_path: Path,
    limit: int,
) -> dict[str, int]:
    stats = {
        "downloaded": 0,
        "reused": 0,
        "updated": 0,
        "failed": 0,
    }

    fix_one_main_image_trigger(conn, log_path)
    rows = fetch_remote_image_rows(conn, limit)
    log(f"Remote image rows in DB: {len(rows)}", log_path)

    for index, row in enumerate(rows, start=1):
        subfolder = infer_subfolder(row)
        log(
            f"[DB {index}/{len(rows)}] ID={row['id']} {subfolder} | {row['url'][:110]}",
            log_path,
        )

        relative_url, reused_existing = process_remote_image(
            session, wwwroot, subfolder, row["url"], log_path
        )
        if relative_url is None:
            stats["failed"] += 1
            continue

        if reused_existing:
            stats["reused"] += 1
        else:
            stats["downloaded"] += 1

        try:
            update_image_url(conn, row["id"], relative_url)
            conn.commit()
            stats["updated"] += 1
        except Exception as exc:
            conn.rollback()
            stats["failed"] += 1
            log(f"    DB update failed for ID={row['id']}: {exc}", log_path)

    return stats


def replace_seed_line_url(
    line: str,
    session: requests.Session,
    wwwroot: Path,
    subfolder: str,
    log_path: Path,
    stats: dict[str, int],
    limit: int,
) -> str:
    match = HTTP_URL_LITERAL_RE.search(line)
    if match is None:
        return line

    if limit > 0 and stats["attempted"] >= limit:
        return line

    remote_url = match.group(1)
    stats["attempted"] += 1

    log(
        f"[SEED {stats['attempted']}] {subfolder} | {remote_url[:110]}",
        log_path,
    )

    relative_url, reused_existing = process_remote_image(
        session, wwwroot, subfolder, remote_url, log_path
    )
    if relative_url is None:
        stats["failed"] += 1
        return line

    if reused_existing:
        stats["reused"] += 1
    else:
        stats["downloaded"] += 1

    stats["updated"] += 1
    return line[: match.start(1)] + relative_url + line[match.end(1) :]


def sync_seed_images(
    session: requests.Session,
    seed_path: Path,
    wwwroot: Path,
    log_path: Path,
    limit: int,
) -> dict[str, int]:
    if not seed_path.exists():
        raise FileNotFoundError(f"seed file not found: {seed_path}")

    lines = seed_path.read_text(encoding="utf-8").splitlines(keepends=True)
    output_lines: list[str] = []
    buffered_source_lines: list[str] | None = None
    direct_insert_subfolder: str | None = None

    stats = {
        "attempted": 0,
        "downloaded": 0,
        "reused": 0,
        "updated": 0,
        "failed": 0,
    }

    for line in lines:
        if buffered_source_lines is not None:
            buffered_source_lines.append(line)
            insert_match = IMAGE_INSERT_RE.search(line)
            if insert_match is None:
                continue

            source_subfolder = infer_subfolder_from_columns(insert_match.group(1))
            for buffered_line in buffered_source_lines:
                output_lines.append(
                    replace_seed_line_url(
                        buffered_line,
                        session,
                        wwwroot,
                        source_subfolder,
                        log_path,
                        stats,
                        limit,
                    )
                )
            buffered_source_lines = None
            continue

        if SOURCE_START_RE.search(line):
            buffered_source_lines = [line]
            continue

        insert_match = IMAGE_INSERT_RE.search(line)
        if insert_match is not None:
            direct_insert_subfolder = infer_subfolder_from_columns(insert_match.group(1))
            output_lines.append(line)
            if ";" in line:
                direct_insert_subfolder = None
            continue

        if direct_insert_subfolder is not None:
            output_lines.append(
                replace_seed_line_url(
                    line,
                    session,
                    wwwroot,
                    direct_insert_subfolder,
                    log_path,
                    stats,
                    limit,
                )
            )
            if ";" in line:
                direct_insert_subfolder = None
            continue

        output_lines.append(line)

    if buffered_source_lines is not None:
        log(
            "Warning: reached end of file while buffering a WITH source(\"Url\" ...) block. "
            "Those lines were left unchanged.",
            log_path,
        )
        output_lines.extend(buffered_source_lines)

    seed_path.write_text("".join(output_lines), encoding="utf-8")
    return stats


def collect_remaining_seed_urls(seed_path: Path) -> list[dict[str, str | int]]:
    lines = seed_path.read_text(encoding="utf-8").splitlines()
    buffered_source_lines: list[tuple[int, str]] | None = None
    direct_insert_subfolder: str | None = None
    remaining: list[dict[str, str | int]] = []

    def collect_line(line_number: int, line_text: str, subfolder: str) -> None:
        for match in HTTP_URL_LITERAL_RE.finditer(line_text):
            remaining.append(
                {
                    "line": line_number,
                    "subfolder": subfolder,
                    "url": match.group(1),
                }
            )

    for line_number, line in enumerate(lines, start=1):
        if buffered_source_lines is not None:
            buffered_source_lines.append((line_number, line))
            insert_match = IMAGE_INSERT_RE.search(line)
            if insert_match is None:
                continue

            source_subfolder = infer_subfolder_from_columns(insert_match.group(1))
            for buffered_line_number, buffered_line in buffered_source_lines:
                collect_line(buffered_line_number, buffered_line, source_subfolder)
            buffered_source_lines = None
            continue

        if SOURCE_START_RE.search(line):
            buffered_source_lines = [(line_number, line)]
            continue

        insert_match = IMAGE_INSERT_RE.search(line)
        if insert_match is not None:
            direct_insert_subfolder = infer_subfolder_from_columns(insert_match.group(1))
            if ";" in line:
                direct_insert_subfolder = None
            continue

        if direct_insert_subfolder is not None:
            collect_line(line_number, line, direct_insert_subfolder)
            if ";" in line:
                direct_insert_subfolder = None

    return remaining


def write_remaining_seed_report(
    items: list[dict[str, str | int]],
    report_path: Path,
    log_path: Path,
) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        for item in items:
            handle.write(
                f"{item['line']}\t{item['subfolder']}\t{item['url']}\n"
            )
    log(f"Remaining seed image URL report: {report_path}", log_path)


def main() -> int:
    args = parse_args()
    log_path = get_default_log_path()
    log_path.write_text("", encoding="utf-8")

    ok, missing = validate_runtime(args)
    if not ok:
        print(
            "Missing required packages. Install with: "
            + "pip install "
            + " ".join(missing)
        )
        return 1

    if args.skip_db and not args.update_seed:
        print("Nothing to do. Use --update-seed, or omit --skip-db to sync database URLs.")
        return 1

    connection_string = None
    if not args.skip_db:
        connection_string = args.connection_string or read_connection_string(args.environment)
        if not connection_string:
            print(
                "No connection string found. Use --connection-string, set IMAGE_MIGRATION_CONNECTION, "
                "or run with --skip-db --update-seed."
            )
            return 1

    wwwroot = Path(args.wwwroot).resolve()
    publish_root = Path(args.publish_root).resolve()
    seed_path = Path(args.seed_file).resolve()
    remaining_report_path = Path(args.remaining_report).resolve()

    log("=" * 60, log_path)
    log("SYNC LOCAL IMAGES", log_path)
    log(f"Environment   : {args.environment}", log_path)
    log(f"wwwroot       : {wwwroot}", log_path)
    log(f"update seed   : {args.update_seed}", log_path)
    log(f"seed path     : {seed_path}", log_path)
    log(f"skip db       : {args.skip_db}", log_path)
    log(f"copy publish  : {args.copy_to_publish}", log_path)
    log("=" * 60, log_path)

    session = requests.Session()
    db_stats = None
    seed_stats = None

    if not args.skip_db:
        conn = psycopg2.connect(connection_string)
        try:
            db_stats = sync_database_images(conn, session, wwwroot, log_path, args.limit)
        finally:
            conn.close()

    if args.update_seed:
        seed_stats = sync_seed_images(session, seed_path, wwwroot, log_path, args.limit)
        remaining_seed_urls = collect_remaining_seed_urls(seed_path)
        write_remaining_seed_report(remaining_seed_urls, remaining_report_path, log_path)

    if args.copy_to_publish:
        copy_images_to_publish(wwwroot, publish_root, log_path)

    log("", log_path)
    log("=" * 60, log_path)
    log("DONE", log_path)
    if db_stats is not None:
        log(f"DB downloaded new files : {db_stats['downloaded']}", log_path)
        log(f"DB reused existing files: {db_stats['reused']}", log_path)
        log(f"DB rows updated        : {db_stats['updated']}", log_path)
        log(f"DB failed              : {db_stats['failed']}", log_path)
    if seed_stats is not None:
        log(f"Seed attempted URLs    : {seed_stats['attempted']}", log_path)
        log(f"Seed downloaded files  : {seed_stats['downloaded']}", log_path)
        log(f"Seed reused files      : {seed_stats['reused']}", log_path)
        log(f"Seed URLs rewritten    : {seed_stats['updated']}", log_path)
        log(f"Seed failed            : {seed_stats['failed']}", log_path)
        log(f"Seed remaining remote  : {len(remaining_seed_urls)}", log_path)
    log(f"Log file               : {log_path}", log_path)
    log("=" * 60, log_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
