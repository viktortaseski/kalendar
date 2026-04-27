"""
Generate a booking QR code for a business.

Usage:
    python generator.py <slug> [--domain DOMAIN] [--out FILE]

Examples:
    python generator.py bloom-hair                       # -> http://bloom-hair.localhost:4200
    python generator.py bloom-hair --domain example.com  # -> https://bloom-hair.example.com
    python generator.py bloom-hair --no-subdomain        # -> http://localhost:4200/businesses/bloom-hair

The URL falls back to a path-based form (http://localhost:4200/businesses/<slug>)
when no domain is supplied AND --no-subdomain is set.
"""
import argparse
import sys

import qrcode

DEFAULT_DOMAIN = "localhost:4200"
FALLBACK_BASE = "http://localhost:4200/businesses"


def build_url(slug: str, domain: str | None, no_subdomain: bool) -> str:
    if no_subdomain or not domain:
        return f"{FALLBACK_BASE}/{slug}"
    scheme = "http" if domain.startswith("localhost") else "https"
    return f"{scheme}://{slug}.{domain}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a booking QR code for a business slug.")
    parser.add_argument("slug", help="Business slug (e.g. bloom-hair)")
    parser.add_argument("--domain", default=DEFAULT_DOMAIN, help=f"Public domain (default: {DEFAULT_DOMAIN})")
    parser.add_argument("--no-subdomain", action="store_true", help="Use path-based URL fallback")
    parser.add_argument("--out", default=None, help="Output PNG path (default: <slug>-qr.png)")
    args = parser.parse_args()

    url = build_url(args.slug, args.domain, args.no_subdomain)
    out = args.out or f"{args.slug}-qr.png"

    qr_img = qrcode.make(url)
    qr_img.save(out)
    print(f"Encoded URL: {url}")
    print(f"Saved as:    {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
