#!/usr/bin/env python3
"""Capture the OrcaRouter UI evidence from the real json-render playground.

Run from the root of a json-render checkout whose dependencies are installed and
whose workspace packages are built, or through the repository's own driver:

    ORCAROUTER_API_KEY=... node scripts/orca-verify.mjs ui-evidence

The script starts the app's own Next.js dev server, drives the real playground
with Playwright/Chromium, and writes `orca-evidence/manifest.json` plus the
screenshots next to the repository root. The catalog phase uses the real
`ORCAROUTER_API_KEY`, so the dropdown reflects the live catalog; the auth phase
installs a dedicated fixture key, so the masked secret that appears in a
screenshot is test data and never a fragment of a real key.

`orca-evidence/` is generated output and is not committed.
"""

import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

REPO = os.getcwd()
OUT = os.path.join(REPO, "orca-evidence")
CATALOG_SOURCE = "https://api.orcarouter.ai/v1/models?capability=chat"
FIXTURE_KEY = "sk-orca-evidencefixture0000000000fixture"
SERVER_LOG = os.path.join(tempfile.gettempdir(), "orca-evidence-server.log")


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def http_json(url, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    request = urllib.request.Request(
        url, data=data, headers=headers, method="POST" if data else "GET"
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


def wait_for_server(base, timeout=240):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(base + "/playground", timeout=15) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            last = exc
        time.sleep(1)
    raise RuntimeError(f"dev server did not become ready: {last}")


def set_credential(base, key):
    """Install a credential through the app's own connect endpoint."""
    return http_json(
        base + "/api/orcarouter/connect", {"method": "api_key", "apiKey": key}
    )


def visible(page, testid):
    """The rendered control.

    The playground renders a desktop and a mobile toolbar, so each test id can
    appear twice; only one is displayed at the 1440px viewport used here.
    """
    return page.locator(f"[data-testid='{testid}']:visible").first


def click_testid(page, testid, timeout=60_000, settle=250):
    """Click a control through its DOM `click` handler.

    The Next.js development overlay intercepts pointer events, so a synthetic
    click is used; React's delegated handler treats it exactly like a real one.
    """
    control = visible(page, testid)
    control.wait_for(state="visible", timeout=timeout)
    control.dispatch_event("click")
    page.wait_for_timeout(settle)


def is_visible(page, testid):
    return page.locator(f"[data-testid='{testid}']:visible").count() > 0


def open_playground(page, base):
    """Load the playground and wait for the app's own ready signal.

    `networkidle` never settles here: the development server keeps a
    hot-reload socket open, so readiness is the rendered toolbar instead.
    """
    page.goto(base + "/playground", wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_selector(
        "[data-testid='orca-provider-api']:visible", state="visible", timeout=120_000
    )
    page.wait_for_timeout(1500)


def dismiss_dialog(page):
    """Close the connect dialog if the app opened it, so it stays out of shots."""
    if is_visible(page, "orca-connect-panel"):
        page.keyboard.press("Escape")
        page.wait_for_selector(
            "[data-testid='orca-connect-panel']", state="hidden", timeout=20_000
        )
        page.wait_for_timeout(400)


def select_provider(page):
    """Select OrcaRouter, reopening the panel when the provider is already on."""
    click_testid(page, "orca-provider-api", settle=800)
    click_testid(page, "orca-provider-api", settle=600)


def capture_auth_methods(page, base):
    set_credential(base, FIXTURE_KEY)
    open_playground(page, base)
    select_provider(page)
    page.wait_for_selector(
        "[data-testid='orca-connect-panel']", state="visible", timeout=60_000
    )
    page.wait_for_timeout(1500)

    panel_text = visible(page, "orca-connect-panel").inner_text()
    api_visible = is_visible(page, "orca-choice-api-key")
    pkce_visible = is_visible(page, "orca-choice-oauth")
    secret_masked = "\u2022\u2022\u2022\u2022" in panel_text
    if not (api_visible and pkce_visible):
        raise AssertionError("both authentication choices must be visible")
    if not secret_masked:
        raise AssertionError("the stored secret must be rendered masked")
    if re.search(r"sk-orca-[A-Za-z0-9]{12,}", panel_text):
        raise AssertionError("the panel must never render a usable key")

    visible(page, "orca-api-key-input").fill("sk-orca-evidencefixture0000")
    page.wait_for_timeout(300)
    api_save_enabled = visible(page, "orca-save-api-key").is_enabled()
    click_testid(page, "orca-choice-oauth", settle=600)
    pkce_start_enabled = visible(page, "orca-start-connect").is_enabled()
    if not api_save_enabled:
        raise AssertionError("Save key must be enabled once a value is entered")
    if not pkce_start_enabled:
        raise AssertionError("Connect with OrcaRouter must be enabled")
    click_testid(page, "orca-choice-api-key", settle=600)

    path = os.path.join(OUT, "auth-methods.png")
    page.screenshot(path=path)
    return {
        "kind": "auth-methods",
        "path": "auth-methods.png",
        "sha256": sha256(path),
        "ui": {
            "api_key_visible": api_visible,
            "pkce_visible": pkce_visible,
            "secret_masked": secret_masked,
            "controls_enabled": bool(api_save_enabled and pkce_start_enabled),
        },
    }


def open_dropdown(page, trigger):
    """Open the listbox, whether or not it is already open (the trigger toggles)."""
    if page.locator("[data-testid='orca-model-listbox']:visible").count() == 0:
        trigger.dispatch_event("click")
    page.wait_for_selector(
        "[data-testid='orca-model-listbox']", state="visible", timeout=60_000
    )
    page.wait_for_timeout(1000)


def dropdown_state(page, trigger):
    listbox = visible(page, "orca-model-listbox")
    options = listbox.locator("[data-testid='orca-model-option']")
    count = options.count()
    ids = [options.nth(i).get_attribute("data-model-id") for i in range(count)]
    box = listbox.bounding_box()
    style = listbox.evaluate(
        "el => { const s = getComputedStyle(el);"
        " return { bg: s.backgroundColor, border: s.borderTopWidth,"
        " borderStyle: s.borderTopStyle }; }"
    )
    trigger_box = trigger.bounding_box()
    right_delta = abs(
        (trigger_box["x"] + trigger_box["width"]) - (box["x"] + box["width"])
    )
    if re.search(r"sk-orca", listbox.inner_text()):
        raise AssertionError("the model control must never render key material")
    return {
        "count": count,
        "ids": ids,
        "ui": {
            "dropdown_open": True,
            "item_count": count,
            "opaque_background": style["bg"] not in ("rgba(0, 0, 0, 0)", "transparent"),
            "visible_border": (
                style["border"] not in ("0px", "") and style["borderStyle"] != "none"
            ),
            "trigger_panel_right_delta": right_delta,
        },
    }


def capture_model_dropdowns(page, base, api_key):
    set_credential(base, api_key)
    open_playground(page, base)
    click_testid(page, "orca-provider-api", settle=1500)
    dismiss_dialog(page)

    # The dropdown must be populated from the live catalog, never from the
    # outage seed. Fail loudly if discovery silently degraded.
    discovery = http_json(base + "/api/orcarouter/models?capability=chat")
    if discovery.get("source") != "live" or discovery.get("degraded"):
        raise AssertionError(
            "model discovery did not return the live catalog: "
            f"source={discovery.get('source')} degraded={discovery.get('degraded')} "
            f"reason={discovery.get('degradedReason')}"
        )
    live = discovery.get("models") or []
    if not live:
        raise AssertionError("the live catalog is empty")
    for model in live:
        if "/" not in model["id"]:
            raise AssertionError(f"vendor namespace lost for {model['id']}")

    trigger = visible(page, "orca-model-trigger")
    open_dropdown(page, trigger)
    text = dropdown_state(page, trigger)
    if text["count"] != len(live):
        raise AssertionError(
            "the rendered dropdown does not match the live catalog: "
            f"{text['count']} rendered vs {len(live)} live"
        )
    # The upstream catalog ordering is not stable between requests, so the
    # rendered set (not the sequence) is what must match the live response.
    if sorted(text["ids"]) != sorted(model["id"] for model in live):
        raise AssertionError(
            "the dropdown contents differ from the live catalog: "
            f"{text['ids']} vs {[model['id'] for model in live]}"
        )

    path = os.path.join(OUT, "text-model-dropdown.png")
    page.screenshot(path=path)
    text_artifact = {
        "kind": "text-model-dropdown",
        "path": "text-model-dropdown.png",
        "sha256": sha256(path),
        "ui": text["ui"],
    }

    # Choosing a text-only model and then requesting image input must clear the
    # selection and drop every model that does not declare image input.
    # Start from the captured listbox (it is open) and pick its first option;
    # selecting closes it, so nothing has to be reopened before the click below.
    listbox = visible(page, "orca-model-listbox")
    listbox.locator("[data-testid='orca-model-option']").first.dispatch_event("click")
    page.wait_for_timeout(800)
    chosen = trigger.inner_text().strip()
    page.wait_for_selector(
        "[data-testid='orca-model-listbox']", state="hidden", timeout=20_000
    )
    click_testid(page, "orca-attachment-image", settle=2500)

    open_dropdown(page, trigger)
    image = dropdown_state(page, trigger)
    if image["count"] <= 0:
        raise AssertionError("image-capable chat models must stay selectable")
    if image["count"] >= text["count"]:
        raise AssertionError("the image filter must remove text-only models")
    declared = {model["id"]: model.get("inputModalities") or [] for model in live}
    for model_id in image["ids"]:
        if "image" not in declared.get(model_id, []):
            raise AssertionError(
                f"{model_id} is offered for image input without declaring it"
            )
    cleared = trigger.inner_text().strip()
    if cleared not in ("select model", "loading models..."):
        raise AssertionError(
            f"an incompatible selection must be cleared, got {cleared!r}"
        )

    mm_path = os.path.join(OUT, "multimodal-model-dropdown.png")
    page.screenshot(path=mm_path)
    image_artifact = {
        "kind": "multimodal-model-dropdown",
        "path": "multimodal-model-dropdown.png",
        "sha256": sha256(mm_path),
        "ui": image["ui"],
    }
    return {
        "count": text["count"],
        "image_count": image["count"],
        "artifacts": [text_artifact, image_artifact],
        "text_ids": text["ids"],
        "image_ids": image["ids"],
        "chosen": chosen,
    }


def main():
    api_key = (os.environ.get("ORCAROUTER_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("ORCAROUTER_API_KEY is required for the live catalog phase")

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    port = free_port()
    base = f"http://127.0.0.1:{port}"
    # Credentials and browser state stay outside the repository, so a run never
    # modifies a tracked file.
    scratch = tempfile.mkdtemp(prefix="orca-evidence-")
    env = {
        **os.environ,
        "ORCAROUTER_ENV_FILE": os.path.join(scratch, ".env.local"),
        "NEXT_TELEMETRY_DISABLED": "1",
        "CI": "1",
    }
    # The key is installed at runtime through the app's own connect endpoint, so
    # the server process does not need it in its environment.
    env.pop("ORCAROUTER_API_KEY", None)

    # A stale build lock from an interrupted run would stop the server starting.
    shutil.rmtree(
        os.path.join(REPO, "apps", "web", ".next", "dev", "lock"), ignore_errors=True
    )

    server = subprocess.Popen(
        ["npx", "next", "dev", "--port", str(port), "--hostname", "127.0.0.1"],
        cwd=os.path.join(REPO, "apps", "web"),
        env=env,
        stdout=open(SERVER_LOG, "wb"),
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    try:
        wait_for_server(base)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path="/usr/bin/chromium",
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                catalog = capture_model_dropdowns(page, base, api_key)
                auth = capture_auth_methods(page, base)
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=30)
        except subprocess.TimeoutExpired:
            server.kill()

    manifest = {
        "automation": {
            "framework": "playwright",
            "passed": True,
            "catalog_source": CATALOG_SOURCE,
            "catalog_model_count": catalog["count"],
            "image_model_count": catalog["image_count"],
        },
        "artifacts": [auth, *catalog["artifacts"]],
        "text_model_ids": catalog["text_ids"],
        "multimodal_model_ids": catalog["image_ids"],
        "selection_cleared_on_incompatible_attachment": True,
        "text_only_selection_before_attachment": catalog["chosen"],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(json.dumps(manifest["automation"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
