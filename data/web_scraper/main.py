import re
import requests

from config import CFG
import json
import time, random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib.parse import quote


# Shared HTTP session with retries for resolver calls (used by Availability/CDX)
def _make_session(total_retries: int = 3, backoff_factor: float = 0.8) -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=total_retries,
        connect=total_retries,
        read=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        raise_on_status=False,
    )
    s.headers.update({"User-Agent": "Mozilla/5.0 (compatible; PetScraper/1.0)"})
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s

_SESSION = _make_session()



def closest_snap_url(original):
    r = _SESSION.get(CFG["WB_AVAIL"], params={"url": original}, timeout=CFG["TIMEOUT"])
    r.raise_for_status()
    j = r.json().get("archived_snapshots", {}).get("closest")
    return (j["url"] if j and j.get("available") else None)


def _toggle_scheme(url: str) -> str:
    if url.startswith("https://"):
        return "http://" + url[len("https://"):]
    if url.startswith("http://"):
        return "https://" + url[len("http://"):]
    return url


def _cdx_best_ts(original: str, only_200: bool = True) -> str | None:
    params = {
        "url": original,
        "output": "json",
        "fl": "timestamp,statuscode",
        "collapse": "digest",
        "limit": "1",
        "sort": "reverse",
    }
    if only_200:
        params["filter"] = "statuscode:200"
    try:
        r = _SESSION.get(CFG["CDX"], params=params, timeout=CFG["TIMEOUT"])
        r.raise_for_status()
        rows = r.json()
        if rows and len(rows) > 1:
            return rows[1][0]
    except Exception:
        return None
    return None


def get_archived_id_url(original: str) -> str | None:
    candidates = []
    for cand in [original, _toggle_scheme(original)]:
        if cand not in candidates:
            candidates.append(cand)
    for cand in candidates:
        try:
            url = closest_snap_url(cand)
        except Exception:
            url = None
        if url:
            raw = re.sub(r"/web/(\d{10,14})([^/]*?)/", r"/web/\1id_/", url)
            if raw.startswith("http://web.archive.org/"):
                raw = "https://" + raw[len("http://"):]
            return raw
    # Fallback to CDX latest 200
    for cand in candidates:
        ts = _cdx_best_ts(cand, only_200=True)
        if ts:
            return f"https://web.archive.org/web/{ts}id_/{cand}"
    # Fallback to any capture
    for cand in candidates:
        ts = _cdx_best_ts(cand, only_200=False)
        if ts:
            return f"https://web.archive.org/web/{ts}id_/{cand}"
    return None



def scrape_pets(output_path: str = "./data/pets.json") -> None:
    from pets import PetScraper

    scraper = PetScraper()
    p_urls = scraper.list_pet_original_urls()

    collected = []
    successes_since_flush = 0
    count = 0

    # keeping unique list of spells as I go

    for original_url in p_urls:
        try:
            time.sleep(random.uniform(0.2, 0.7))
            id_url = get_archived_id_url(original_url)
            if not id_url:
                print("No archived capture found. Skipping.")
                continue

            pet = scraper.build_pet_obj(id_url)
            collected.append(pet)
            count += 1
            successes_since_flush += 1
            print(f"Count: {count}")
            if successes_since_flush % 20 == 0:
                try:
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(collected, f, ensure_ascii=False, indent=2)
                    print(f"Checkpoint saved at {len(collected)} pets")


                except Exception as e:
                    print(f"Checkpoint write failed: {e}")
        except Exception as e:
            print(f"Error scraping {original_url}: {e}")
            continue

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collected, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(collected)} pets to {output_path}")



def collect_spell_list_from_pets(pets_json_path: str = "./data/pets.json") -> list[str]:
    try:
        pets = json.load(open(pets_json_path, "r", encoding="utf-8"))
    except Exception:
        return []

    seen, out = set(), []
    for pet in (pets or []):
        for name in (pet.get("cards") or []):
            base = " ".join(str(name).split()).strip()
            s = base.replace(" ", "_") if base else ""
            if s and s not in seen:
                seen.add(s)
                out.append(s)
    return out


def scrape_spells(output_path: str = "./data/spells.json") -> None:
    from spells import SpellScraper

    scraper = SpellScraper()
    spell_list = collect_spell_list_from_pets()
    if not spell_list:
        print("No spells discovered from pets.json. Nothing to scrape.")
        return

    collected = []
    successes_since_flush = 0
    count = 0

    for spell in spell_list:
        time.sleep(random.uniform(0.2, 0.7))
        encoded = quote(spell, safe="")
        candidates = [
            f"https://{CFG['DOMAIN']}/wiki/ItemCard:{encoded}",
            f"https://{CFG['DOMAIN']}/wiki/Spell:{encoded}",
        ]
        id_url = None
        for orig in candidates:
            id_url = get_archived_id_url(orig)
            if id_url:
                break
        if not id_url:
            # Fallback: construct icon via Special:FilePath and do not skip
            file_name = f"(Item Card) {spell.replace('_', ' ')}.png"
            icon = f"https://{CFG['DOMAIN']}/wiki/Special:FilePath/{quote(file_name, safe='')}"
            curr_spell = {"name": spell.replace('_', ' '), "icon": icon, "source": None}
        else:
            curr_spell = scraper.build_spell_obj(id_url)
        collected.append(curr_spell)
        count += 1
        successes_since_flush += 1
        print(f"Spells scraped: {count}")
        if successes_since_flush % 20 == 0:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(collected, f, ensure_ascii=False, indent=2)
            print(f"Spell checkpoint saved at {len(collected)} entries")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collected, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(collected)} spells to {output_path}")


def collect_ability_list_from_pets(pets_json_path: str = "./data/pets.json") -> list[str]:
    try:
        pets = json.load(open(pets_json_path, "r", encoding="utf-8"))
    except Exception:
        return []
    seen, out = set(), []
    for pet in (pets or []):
        abilities = pet.get("abilities") or {}
        for bucket in (abilities.get("talents") or []), (abilities.get("derby") or []):
            for name in bucket:
                base = " ".join(str(name).split()).strip()
                s = base.replace(" ", "_") if base else ""
                if s and s not in seen:
                    seen.add(s)
                    out.append(s)
    return out


def scrape_abilities(output_path: str = "./data/abilities.json") -> None:
    from abilities import AbilityScraper

    scraper = AbilityScraper()
    ability_list = collect_ability_list_from_pets()
    
    collected = []
    successes_since_flush = 0
    count = 0

    for ability in ability_list:
        try:
            time.sleep(random.uniform(0.2, 0.7))
            # Try multiple title variants to improve Wayback hit rate
            variants = []
            variants.append(ability)
            if ability:
                variants.append(ability[0:1].upper() + ability[1:])
            parts = ability.split("_") if ability else []
            if parts:
                variants.append("_".join(w[:1].upper() + w[1:] if w else w for w in parts))
            seen_var = set()
            variants = [v for v in variants if not (v in seen_var or seen_var.add(v))]

            id_url = None
            for v in variants:
                encoded = quote(v, safe="")
                original_url = f"https://{CFG['DOMAIN']}/wiki/PetAbility:{encoded}"
                id_url = get_archived_id_url(original_url)
                if id_url:
                    break
            if not id_url:
                # Fallback: minimal object without icon/source
                print(f"couldn't resolve {ability}")
            else:
                obj = scraper.build_ability_obj(id_url)
                print(obj)
                collected.append(obj)
                count += 1
                successes_since_flush += 1
            print(f"Abilities scraped: {count}")
            if successes_since_flush % 20 == 0:
                try:
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(collected, f, ensure_ascii=False, indent=2)
                    print(f"Ability checkpoint saved at {len(collected)} entries")
                except Exception as e:
                    print(f"Ability checkpoint write failed: {e}")
        except Exception as e:
            print(f"Error scraping ability {ability}: {e}")
            continue

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collected, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(collected)} abilities to {output_path}")
    


def scrape_spells_from_list(spell_list: list[str], output_path: str = "./data/spells.json") -> None:
    from spells import SpellScraper

    scraper = SpellScraper()
    collected = []
    successes_since_flush = 0
    count = 0

    for spell in spell_list:
        try:
            time.sleep(random.uniform(0.2, 0.7))
            encoded = quote(spell, safe="")
            candidates = [
                f"https://{CFG['DOMAIN']}/wiki/ItemCard:{encoded}",
                f"https://{CFG['DOMAIN']}/wiki/Spell:{encoded}",
            ]
            id_url = None
            for orig in candidates:
                id_url = get_archived_id_url(orig)
                if id_url:
                    break
            if not id_url:
                # Fallback: use Special:FilePath without skipping
                file_name = f"(Item Card) {spell.replace('_', ' ')}.png"
                icon = f"https://{CFG['DOMAIN']}/wiki/Special:FilePath/{quote(file_name, safe='')}"
                obj = {"name": spell.replace('_', ' '), "icon": icon, "source": None}
            else:
                obj = scraper.build_spell_obj(id_url)
            collected.append(obj)
            count += 1
            successes_since_flush += 1
            print(f"Spells scraped: {count}")
            if successes_since_flush % 20 == 0:
                try:
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(collected, f, ensure_ascii=False, indent=2)
                    print(f"Spell checkpoint saved at {len(collected)} entries")
                except Exception as e:
                    print(f"Spell checkpoint write failed: {e}")
        except Exception as e:
            print(f"Error scraping spell {spell}: {e}")
            continue

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collected, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(collected)} spells to {output_path}")
 


if __name__ == "__main__":
  #  scrape_pets()
#  scrape_spells()
  scrape_abilities()
 


