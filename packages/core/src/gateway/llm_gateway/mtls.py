"""Trusted-edge mTLS enforcement shared by HTTP and WebSocket traffic."""

from __future__ import annotations

import os
from collections.abc import Mapping


def mtls_mode() -> str:
    """Return the configured edge mode, failing closed on invalid values."""
    mode = os.environ.get("GATEWAY_MTLS_MODE", "off").strip().lower()
    return mode if mode in {"off", "permissive", "require"} else "require"


def has_verified_client(headers: Mapping[str, str]) -> bool:
    """Trust only an explicit verification result injected by the edge.

    Certificate identity headers such as X-Forwarded-Client-Cert are data, not
    proof. Operators must strip the configured verification header from
    untrusted requests and inject it only after TLS client verification.
    """
    header = os.environ.get("GATEWAY_MTLS_VERIFY_HEADER", "x-client-cert-verified").strip().lower()
    expected = os.environ.get("GATEWAY_MTLS_VERIFY_VALUE", "SUCCESS").strip()
    if not header or not expected:
        return False
    return headers.get(header, "").strip().casefold() == expected.casefold()


def mtls_required() -> bool:
    return mtls_mode() == "require"
