# flickr-mcp

[![npm](https://img.shields.io/npm/v/flickr-mcp)](https://www.npmjs.com/package/flickr-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-blue)](https://registry.modelcontextprotocol.io/v0.1/servers?search=flickr-mcp)
[![Sponsor](https://img.shields.io/github/sponsors/MK3Core?label=Sponsor&logo=githubsponsors&color=EA4AAA)](https://github.com/sponsors/MK3Core)

An MCP server that gives AI assistants authenticated access to your Flickr photo library. Tag photos, write descriptions, set titles, manage group memberships, and run a full automated processing workflow — all driven by AI, applied to your photos.

Works with any MCP-compatible AI client: Claude, Cursor, Windsurf, and others.

---

## What it does

Once connected, you can ask your AI assistant things like:

- *"Process all my untagged photos"* — scans your whole library, tags and describes everything in one pass
- *"Tag all the photos in my Japan album"*
- *"Write a description for this photo"* (with a Flickr URL or photo ID)
- *"Find my car photos and add them to relevant Flickr groups"*
- *"Look at my recent uploads and add relevant tags to each one"*

The AI looks at your photos visually (via built-in image fetching), generates metadata from the actual image content and EXIF data, and either previews changes before applying or runs fully automated depending on the tool.

---

## Requirements

- Node.js 18 or later
- A **Flickr Pro account** — Flickr requires Pro to register API applications
- An MCP-compatible AI client

---

## Setup

### 1. Register a Flickr API key

> **Note:** Flickr requires a [Pro account](https://www.flickr.com/account/upgrade/pro) to register API applications (~$8/month or ~$72/year). If you're using Flickr seriously enough to want AI-assisted tagging, you likely already have one.

Go to [flickr.com/services/apps/create/noncommercial](https://www.flickr.com/services/apps/create/noncommercial) and fill out the short form — any app name works, select "personal use." It takes about two minutes. Copy the **API key** and **API secret** from the next page.

### 2. Run the setup command

```bash
npx flickr-mcp setup
```

A browser window will open with a setup wizard. Paste your API key and secret, then follow the prompts to authorize access to your Flickr account. Your credentials are saved to `~/.config/flickr-mcp/credentials.json` and never leave your machine.

### 3. Add flickr-mcp to your AI client

The easiest way is to paste the following prompt directly into your AI assistant. It contains everything needed — the config entry, the setup reminder, and a pointer to the full docs:

> Add an MCP server to my config with these details:
>
> - **Name:** `flickr`
> - **Command:** `npx`
> - **Args:** `["flickr-mcp"]`
>
> The full config entry is:
> ```json
> "flickr": {
>   "command": "npx",
>   "args": ["flickr-mcp"]
> }
> ```
>
> Add this to the `mcpServers` block in my MCP config file, then let me know where you put it and remind me to restart the client.
>
> Full documentation and source: https://github.com/MK3Core/flickr-mcp

Your assistant knows where its own config file lives and will place the entry correctly regardless of which client you're using. After it confirms, restart the client.

<details>
<summary>Prefer to do it manually?</summary>

**Claude Code** — add to `~/.claude/settings.json` (global) or `.claude/settings.json` in a project:

```json
{
  "mcpServers": {
    "flickr": {
      "command": "npx",
      "args": ["flickr-mcp"]
    }
  }
}
```

**Claude Desktop**
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "flickr": {
      "command": "npx",
      "args": ["flickr-mcp"]
    }
  }
}
```

**Cursor / Windsurf** — check your client's MCP settings panel, or ask your assistant to find and edit the config file for you.

</details>

---

## Full automated workflow

The quickest way to process your entire library is two tool calls:

1. **`flickr_get_unprocessed_photos`** — scans every photo in your library and returns a list of anything missing tags, a description, or a real title. Raw camera filenames like `DSC_0042` or Lightroom export suffixes like `IMG_1234-Edit` are flagged automatically.

2. **`flickr_process_photo`** — applies title, description, tags, and group assignments to a single photo in one atomic call. The AI fetches the image visually, reads EXIF for camera/lens/location data, generates up to ~20 focused tags following Flickr best practices, writes a concise description, and adds the photo to relevant groups — joining them automatically if needed.

Just ask: *"Process all my untagged photos"* and the AI will page through the unprocessed list and handle each one.

---

## Available tools

These are the tools your AI assistant can call once the server is running. You don't interact with them directly — just describe what you want in plain language.

### Reading your library

| Tool | Description |
|---|---|
| `flickr_list_photos` | List your photostream, paginated |
| `flickr_get_photo` | Full photo details; optionally include the image (`include_image`) at `medium` (default) or `large` via Flickr `photos.getSizes` |
| `flickr_get_exif` | Camera metadata: make, model, lens, GPS, shutter speed, ISO |
| `flickr_search_my_photos` | Search your own photos by keyword or tag |
| `flickr_get_albums` | List your albums |
| `flickr_get_album_photos` | List photos inside an album |

### Editing metadata

| Tool | Description |
|---|---|
| `flickr_add_tags` | Add tags to a photo (previews before applying by default) |
| `flickr_remove_tag` | Remove a tag from a photo |
| `flickr_set_metadata` | Set a photo's title and/or description (previews before applying by default) |

### Group management

| Tool | Description |
|---|---|
| `flickr_search_groups` | Search Flickr groups by keyword — returns name, member count, pool size |
| `flickr_join_group` | Join a Flickr group programmatically (accepts group rules automatically) |
| `flickr_add_to_group` | Add a photo to a group pool (previews before applying by default) |

### Automated workflow

| Tool | Description |
|---|---|
| `flickr_get_unprocessed_photos` | Scan your entire library and return photos missing tags, descriptions, or real titles |
| `flickr_process_photo` | Apply title + description + tags + group assignments in one call, with auto-join |

Individual write tools (`flickr_add_tags`, `flickr_set_metadata`, `flickr_add_to_group`) show a dry-run preview before applying. `flickr_process_photo` runs without preview by default — it's designed for batch automation.

---

## Tagging approach

The AI follows Flickr-specific best practices when generating tags:

- **Target ~20 tags** per photo — enough to reach the right audiences without diluting reach
- **Broad + specific subject pairing**: "dog" and "golden retriever", not just one or the other
- **Location chain**: continent, country, region, city, venue where available
- **Gear tags from EXIF**: camera body and focal length (e.g. "sony a7 iv", "85mm")
- **Never**: noise tags ("photo", "image", "picture"), irrelevant popular tags, or tag spam — Flickr's spam policy can hide photos from search

---

## Privacy and scope

This server can only access **your own photos**. It has no ability to read, search, or modify other users' content. The write access it requests is limited to your account.

Your API credentials are stored locally at `~/.config/flickr-mcp/credentials.json` and are never sent anywhere except Flickr's own API.

---

## Rate limiting

The server uses a token bucket that targets 3,000 requests/hour (Flickr's limit is 3,600). Burst of up to 10 requests is allowed. Image fetches count against the budget. Under normal use you will not hit this limit.

---

## Running from source

```bash
git clone https://github.com/MK3Core/flickr-mcp
cd flickr-mcp
npm install
npm run build
node dist/index.js setup
```

Then point your MCP client at `node /path/to/flickr-mcp/dist/index.js` instead of `npx flickr-mcp`.

---

## Support

flickr-mcp is free and open source. If it saves you time, a GitHub sponsorship is always appreciated — it helps justify spending more time on projects like this.

[![Sponsor](https://img.shields.io/github/sponsors/MK3Core?label=Sponsor&logo=githubsponsors&color=EA4AAA)](https://github.com/sponsors/MK3Core)

---

## Contributing

Issues and pull requests are welcome. The codebase is intentionally small — around 700 lines of TypeScript across six files.

```
src/
  index.ts          Entry point
  setup.ts          OAuth setup flow
  auth.ts           OAuth 1.0a implementation + credential storage
  rate-limiter.ts   Token bucket (3,000 req/hour)
  flickr-client.ts  Flickr API wrapper
  tools.ts          All tool definitions and handlers
```
