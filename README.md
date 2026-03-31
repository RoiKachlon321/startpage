# Startpage

A keyboard-driven bookmark homepage you fully control. No accounts, no cloud — your bookmarks live in your browser's localStorage and a local JSON file.

Built with Angular 21. Single-page, zero external dependencies at runtime.

![Dark themed startpage with categorized bookmarks in a masonry grid](https://img.shields.io/badge/theme-dark-0f0f17?style=flat-square) ![Angular 21](https://img.shields.io/badge/Angular-21-dd0031?style=flat-square)

## Features

- **Masonry grid layout** — categories auto-flow into columns, responsive down to mobile
- **Keyboard-first navigation** — vim keys, hint mode, fuzzy search
- **Edit mode** — add, edit, delete bookmarks and categories right in the browser
- **Google Favicons** — icons fetched automatically from any URL
- **Import / Export** — download your bookmarks as JSON, load them on any machine
- **localStorage persistence** — instant load, survives page refreshes
- **Sections** — group bookmarks within a category (e.g. "Apple", "Google" under "Dev")

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

## Pairs Great With Vim Browser Extensions

This startpage is designed with keyboard-first navigation in mind. It works beautifully alongside vim-style browser extensions:

- **[Vimlike](https://apps.apple.com/app/vimlike/id1584519802)** (Safari)
- **[Vimium](https://chromewebstore.google.com/detail/vimium/dbepggeogbaibhgnhhndojpepiihcmeb)** (Chrome / Edge)
- **[Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/)** (Firefox)

The startpage handles its own hint mode (`f`) and search (`s`) for bookmarks, while your vim extension handles everything else — link following on other sites, tab switching, history navigation. They complement each other without conflicting.

**Bonus:** Vim extensions like Vimari remove the annoying auto-focus on the URL bar when opening a new tab, so keyboard shortcuts on this page work immediately. And since you might miss the URL bar for quick searches, the built-in search (`s`) has a Google fallback — type anything that doesn't match a bookmark and hit Enter to search Google.

## Getting Started

```bash
git clone https://github.com/RoiKachlon321/startpage.git
cd startpage
npm install
ng serve
```

Open `http://localhost:4200`. On first visit, the starter bookmarks from `public/bookmarks.json` load into localStorage. After that, all changes persist in your browser.

### Make It Your Own

1. Press `e` to enter edit mode
2. Add your categories and bookmarks
3. Click **Export** in the toolbar to save a backup JSON
4. To start fresh on another machine, click **Import** and load your JSON

### Use as Browser Homepage

> The examples below use port `7777`. If it conflicts with something on your machine, swap it for any free port.

Build the production bundle:

```bash
ng build
```

#### Quick test (stops when you close the terminal)

```bash
python3 server.py
```

#### Always-on (macOS — auto-starts on login)

Run this from the project root:

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

That's it. The server auto-starts on login, restarts if it crashes, and serves on `http://localhost:7777`. Set that as your browser homepage.

To stop it: `launchctl unload ~/Library/LaunchAgents/com.startpage.plist`

#### Always-on (Linux — auto-starts on login)

Run this from the project root:

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

To stop it: `systemctl --user disable --now startpage`

#### Always-on (Windows — auto-starts on login)

Run this in PowerShell from the project root:

```powershell
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\startpage.lnk")
$Shortcut.TargetPath = "pythonw"
$Shortcut.Arguments = "$(Get-Location)\server.py"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
```

This creates a startup shortcut that runs the server hidden in the background on login.

To stop it: delete `startpage.lnk` from `shell:startup` (type that in the Run dialog).

## Data Format

Bookmarks are stored in two places: localStorage (fast loading) and `bookmarks.json` on disk (persistent backup). When you use `server.py`, every edit auto-saves to both — no manual export needed. If you ever clear browser data, bookmarks reload from the file automatically.

> **Note:** If you're using `ng serve` for development, auto-save to file won't work (no `server.py` running). It falls back to localStorage only. Use `server.py` for the full experience.

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


## License

MIT
