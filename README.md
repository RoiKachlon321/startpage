# Startpage

A keyboard-driven bookmark homepage you fully control. No accounts, no cloud — your bookmarks live locally on your machine in a JSON file.

Built with Angular 21. Includes a tiny Python server that serves the page and auto-saves your edits to disk.

![Dark themed startpage with categorized bookmarks in a masonry grid](https://img.shields.io/badge/theme-dark-0f0f17?style=flat-square) ![Angular 21](https://img.shields.io/badge/Angular-21-dd0031?style=flat-square)

## Features

- **Masonry grid layout** — categories auto-flow into columns, responsive down to mobile
- **Keyboard-first navigation** — vim keys, hint mode, fuzzy search
- **Edit mode** — add, edit, delete bookmarks and categories right in the browser
- **Auto-save** — every edit saves to `bookmarks.json` on disk via `server.py`
- **Google Favicons** — icons fetched automatically from any URL
- **Import / Export** — download your bookmarks as JSON, load them on any machine
- **Sections** — group bookmarks within a category (e.g. "Apple", "Google" under "Dev")

## How It Works

```
browser ──edit──▶ localStorage (instant)
                  │
                  └──POST──▶ server.py ──▶ bookmarks.json (on disk)

browser ──load──▶ localStorage (if exists)
                  │
                  └──fetch──▶ bookmarks.json (first visit / cleared cache)
```

- **`bookmarks.json`** is your persistent data — it lives on disk, survives browser clears, and is your backup
- **localStorage** is a fast cache so the page loads instantly
- **`server.py`** serves the page AND handles saving — every time you edit a bookmark, it writes to `bookmarks.json` automatically
- If you clear browser data, bookmarks reload from `bookmarks.json` on next visit — nothing is lost

## Getting Started

### 1. Clone and build

```bash
git clone https://github.com/RoiKachlon321/startpage.git
cd startpage
npm install
ng build
```

### 2. Run the server

```bash
python3 server.py
```

Open `http://localhost:7777`. That's it — your startpage is running.

> Port `7777` is the default. Change it with `PORT=9999 python3 server.py` or edit the `PORT` variable in `server.py`.

### 3. Make it yours

1. Press `e` to enter edit mode
2. Add your categories and bookmarks
3. Press `Esc` or click **Done** when finished
4. Your changes are saved automatically — both in the browser and to `bookmarks.json` on disk

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `f` | **Hint mode** — type 2-letter codes to jump to any bookmark |
| `s` | **Search** — fuzzy search across all bookmarks, with Google fallback |
| `e` | **Edit mode** — toggle the editing UI |
| `j` / `k` | Scroll down / up |
| `d` / `u` | Half-page down / up |
| `g` / `G` | Jump to top / bottom |
| `Esc` | Exit current mode |

Hover the `?` in the bottom-right corner for a quick reference.

## Set as Browser Homepage

You want `server.py` running all the time so the page is always available. Pick your OS:

> All commands below should be run from the project root.

### macOS (auto-starts on login)

```bash
cat > ~/Library/LaunchAgents/com.startpage.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.startpage</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$(pwd)/server.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
launchctl load ~/Library/LaunchAgents/com.startpage.plist
```

To stop: `launchctl unload ~/Library/LaunchAgents/com.startpage.plist`

### Linux (auto-starts on login)

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/startpage.service << EOF
[Unit]
Description=Startpage server

[Service]
ExecStart=/usr/bin/python3 $(pwd)/server.py
Restart=always

[Install]
WantedBy=default.target
EOF
systemctl --user enable --now startpage
```

To stop: `systemctl --user disable --now startpage`

### Windows (auto-starts on login)

Run in PowerShell:

```powershell
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\startpage.lnk")
$Shortcut.TargetPath = "pythonw"
$Shortcut.Arguments = "$(Get-Location)\server.py"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
```

To stop: delete `startpage.lnk` from `shell:startup` (type that in the Run dialog).

### Then set your homepage

Set `http://localhost:7777` as your browser's homepage. Done.

## Pairs Great With Vim Browser Extensions

This startpage is designed with keyboard-first navigation in mind. It works beautifully alongside vim-style browser extensions:

- **[Vimlike](https://apps.apple.com/app/vimlike/id1584519802)** (Safari)
- **[Vimium](https://chromewebstore.google.com/detail/vimium/dbepggeogbaibhgnhhndojpepiihcmeb)** (Chrome / Edge)
- **[Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/)** (Firefox)

The startpage handles its own hint mode (`f`) and search (`s`) for bookmarks, while your vim extension handles everything else — link following on other sites, tab switching, history navigation. They complement each other without conflicting.

**Bonus:** Vim extensions like Vimlike remove the annoying auto-focus on the URL bar when opening a new tab, so keyboard shortcuts on this page work immediately. And since you might miss the URL bar for quick searches, the built-in search (`s`) has a Google fallback — type anything that doesn't match a bookmark and hit Enter to search Google.

## Data Format

Your bookmarks live in `bookmarks.json`. You can edit this file directly or use the edit UI in the browser — both work.

```json
{
  "version": 1,
  "categories": [
    {
      "id": "c1",
      "name": "Dev",
      "color": "cyan",
      "sections": [
        {
          "id": "s1",
          "name": null,
          "bookmarks": [
            { "id": "b1", "name": "GitHub", "url": "https://github.com/", "customIcon": null }
          ]
        }
      ]
    }
  ]
}
```

**Available colors:** `blue`, `green`, `purple`, `orange`, `red`, `cyan`, `pink`, `teal`

> **For development:** `ng serve` works for UI development but won't auto-save to disk (no `server.py`). Use `python3 server.py` for the full experience.

## License

MIT
