CFG = {
    "CDX": "https://web.archive.org/cdx/search/cdx",
    "WB_WEB": "https://web.archive.org/web",
    "WB_AVAIL": "https://archive.org/wayback/available",
    "DOMAIN": "wiki.wizard101central.com",
    "OUT": "dump.txt",
    # Timeout can be a number (read timeout seconds) or a (connect, read) tuple.
    # Use a slightly longer connect + read timeout for slow Wayback responses.
    "TIMEOUT": (20, 180),
}
