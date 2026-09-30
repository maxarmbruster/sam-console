# sam-console

Voice intake console for talkpush.com/demo. UI layer over a swappable transport; transport #1 is the ElevenLabs Conversation SDK, loaded in the browser from esm.sh.

## Embed (Webflow)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/maxarmbruster/sam-console@main/sam.css">
<div data-sam-agent="agent_7701kj8r7k2feqg8ge4jqmmkbhan" data-locale="en" data-theme="light"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/maxarmbruster/sam-console@main/sam.js"></script>
```

Attributes on the root div:

| attribute | values | default |
|---|---|---|
| `data-sam-agent` | ElevenLabs agent id | required |
| `data-locale` | `en`, `es`, … (agent must allow language override) | agent default |
| `data-theme` | `light`, `dark` | `light` |
| `data-title`, `data-sub`, `data-cta` | copy overrides for A/B tests | built-in copy |
| `data-connection` | `webrtc`, `websocket` | `webrtc` |
| `data-debug` | present = console logging | off |

## Analytics

Fires through `gtag` (or `dataLayer` if gtag is absent): `sam_call_start`, `sam_call_end` (with `sam_seconds`), `sam_mic_denied`. Each carries `sam_mode` (`voice`/`typed`) and `sam_theme`.

## Cache

jsDelivr caches `@main` for up to 12 hours. For an immediate refresh after a push, purge: `https://purge.jsdelivr.net/gh/maxarmbruster/sam-console@main/sam.js` (and `sam.css`).
