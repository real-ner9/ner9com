"""Builds the site's music library from the owner's collection.

The collection is nested (Artist/Album, Artist/Albums/Album, Album/CD1) and partly lossless; the
backend reads one folder per album. This walks the source, flattens it into album folders,
re-encodes lossless files (FLAC, Apple Lossless) to AAC 256 kbps .m4a, which every browser plays
and is a fraction of the size, copies MP3 and AAC as they are, and keeps one cover per album.
Originals are never touched. Finished files are skipped, so it can be stopped and run again.

Usage (ffmpeg and ffprobe on PATH, or FFMPEG_BIN pointing at their folder):
    python build_web_library.py SOURCE OUT [--extra DIR ...] [--jobs N]

Then upload OUT to the VPS (see CLAUDE.md, "Music library").
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

AUDIO = {'.mp3', '.flac', '.m4a'}
IMAGES = {'.jpg', '.jpeg', '.png'}
# Folders that hold one disc of a multi-disc album; their tracks join the parent album.
DISC = re.compile(r'^(cd|disc|disk)\s*\d+$', re.IGNORECASE)
# Top-level folders that are not music.
SKIP_TOP = ('Грин_Роберт_48_законов_власти',)
COVER_NAMES = ('cover', 'folder', 'front')
# "Deftones - iTunes Discography", "1.Kla$ - Дискография" -> the artist.
DISCOGRAPHY = re.compile(r'\s*-\s*(itunes\s+)?(discography|дискография)$', re.IGNORECASE)

BIN = os.environ.get('FFMPEG_BIN', '')
FFMPEG = str(Path(BIN, 'ffmpeg')) if BIN else 'ffmpeg'
FFPROBE = str(Path(BIN, 'ffprobe')) if BIN else 'ffprobe'


def find_albums(source: Path):
    """{album folder: [(audio file, disc prefix)]}, CD folders merged into their parent."""
    albums: dict[Path, list[tuple[Path, str]]] = {}
    for file in sorted(source.rglob('*')):
        if file.suffix.lower() not in AUDIO or not file.is_file() or file.stat().st_size == 0:
            continue
        relative = file.relative_to(source)
        if len(relative.parts) < 2 or relative.parts[0].startswith(SKIP_TOP):
            continue
        folder, prefix = file.parent, ''
        if DISC.match(folder.name):
            prefix = f'{folder.name.replace(" ", "")}-'
            folder = folder.parent
        albums.setdefault(folder, []).append((file, prefix))
    return albums


def album_names(albums, source: Path):
    """Flat folder name per album: its own name, plus the artist when two albums share it."""
    counts: dict[str, int] = {}
    for folder in albums:
        counts[folder.name] = counts.get(folder.name, 0) + 1
    names = {}
    for folder in albums:
        artist = folder.relative_to(source).parts[0]
        clash = counts[folder.name] > 1 and artist != folder.name
        names[folder] = f'{folder.name} ({artist})' if clash else folder.name
    return names


def artist_of(folder: Path, source: Path):
    """The collection is sorted by artist at the top level; that beats the tracks' tags."""
    return DISCOGRAPHY.sub('', folder.relative_to(source).parts[0])


def write_album_info(target_dir: Path, artist: str):
    """album.json next to the tracks; the backend reads the artist from it."""
    info = target_dir / 'album.json'
    content = json.dumps({'artist': artist}, ensure_ascii=False)
    if not info.exists() or info.read_text(encoding='utf-8') != content:
        info.write_text(content, encoding='utf-8')


def codec(path: Path):
    result = subprocess.run(
        [FFPROBE, '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name',
         '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True,
    )
    return result.stdout.strip()


def convert(source_file: Path, target_dir: Path, prefix: str):
    """One track: copy if already lossy, otherwise encode to AAC. Returns what was done."""
    ext = source_file.suffix.lower()
    stem = f'{prefix}{source_file.stem}'
    # Either outcome counts as done; checked before ffprobe, which is slow per file.
    if any((target_dir / f'{stem}{e}').is_file() for e in {ext, '.m4a'}):
        return 'skip'
    lossy = ext == '.mp3' or (ext == '.m4a' and codec(source_file) == 'aac')
    target = target_dir / f'{stem}{ext if lossy else ".m4a"}'
    partial = target.with_name(target.name + '.part')
    if lossy:
        shutil.copyfile(source_file, partial)
    else:
        subprocess.run(
            [FFMPEG, '-nostdin', '-v', 'error', '-y', '-i', str(source_file),
             '-map', '0:a:0', '-map_metadata', '0', '-c:a', 'aac', '-b:a', '256k',
             '-movflags', '+faststart', '-f', 'mp4', str(partial)],
            check=True,
        )
    partial.replace(target)
    return 'copy' if lossy else 'encode'


def cover(folder: Path, files, target_dir: Path):
    """cover.<ext> from a cover/folder/front image, any image, or the first track's art."""
    if any(target_dir.glob('cover.*')):
        return
    images = [p for d in {folder, *(f.parent for f, _ in files)} for p in d.iterdir()
              if p.suffix.lower() in IMAGES]
    images.sort(key=lambda p: (not p.stem.lower().startswith(COVER_NAMES), len(str(p))))
    if images:
        shutil.copyfile(images[0], target_dir / f'cover{images[0].suffix.lower()}')
        return
    subprocess.run(
        [FFMPEG, '-nostdin', '-v', 'error', '-y', '-i', str(files[0][0]), '-an',
         '-frames:v', '1', str(target_dir / 'cover.jpg')],
        capture_output=True,
    )


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # album names are Cyrillic, Japanese…
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('source', type=Path)
    parser.add_argument('out', type=Path)
    parser.add_argument('--extra', type=Path, action='append', default=[],
                        help='flat album folders to copy as they are (e.g. the public-domain ones)')
    parser.add_argument('--jobs', type=int, default=max((os.cpu_count() or 4) - 2, 1))
    args = parser.parse_args()

    albums = find_albums(args.source)
    names = album_names(albums, args.source)
    print(f'{len(albums)} albums, {sum(len(f) for f in albums.values())} tracks', flush=True)

    tasks = []
    for folder, files in albums.items():
        target_dir = args.out / names[folder]
        target_dir.mkdir(parents=True, exist_ok=True)
        write_album_info(target_dir, artist_of(folder, args.source))
        cover(folder, files, target_dir)
        tasks += [(file, target_dir, prefix) for file, prefix in files]

    done, failed = {'skip': 0, 'copy': 0, 'encode': 0}, []
    with ThreadPoolExecutor(args.jobs) as pool:
        futures = {pool.submit(convert, *task): task[0] for task in tasks}
        for index, future in enumerate(as_completed(futures), 1):
            try:
                done[future.result()] += 1
            except Exception as error:  # noqa: BLE001 - report and carry on
                failed.append(f'{futures[future]}: {error}')
            if index % 50 == 0 or index == len(tasks):
                print(f'{index}/{len(tasks)} {done}', flush=True)

    for extra in args.extra:
        for album in (p for p in extra.iterdir() if p.is_dir()):
            shutil.copytree(album, args.out / album.name, dirs_exist_ok=True)
            print(f'copied {album.name}', flush=True)

    for line in failed:
        print('FAILED', line, flush=True)
    print(f'done: {done}, failed: {len(failed)}', flush=True)


if __name__ == '__main__':
    main()
