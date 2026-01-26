# EasyEmu Quick Start Guide

Welcome to EasyEmu! This guide will help you get from zero to playing your favorite retro games in just a few minutes.

---

## Step 1: Download EasyEmu

1. Go to the [Releases](../../releases) page
2. Under **Assets**, download one of these files:
   - **`EasyEmu-Setup-X.X.X.exe`** - Installer (recommended)
   - **`EasyEmu-X.X.X.exe`** - Portable version (no installation needed)

> **Note:** Windows may show a security warning because the app isn't signed. Click "More info" then "Run anyway" to continue.

---

## Step 2: Install & Launch

### If you downloaded the Installer:
1. Double-click `EasyEmu-Setup-X.X.X.exe`
2. Follow the installation wizard
3. Choose where to install (the default location is fine)
4. Click "Install"
5. Launch EasyEmu from your desktop or Start Menu

### If you downloaded the Portable version:
1. Double-click `EasyEmu-X.X.X.exe` to run it directly
2. No installation needed - you can put this file anywhere you like

---

## Step 3: First-Time Setup

When you first open EasyEmu, a Setup Wizard will guide you through configuration:

### 1. Welcome Screen
Click **Next** to begin setup.

### 2. Add Your ROM Folders
This is where your game files are stored.

1. Click **Add ROM Folder**
2. Navigate to the folder containing your game files (ROMs)
3. Click **Select Folder**
4. Repeat if you have games in multiple folders
5. Click **Next**

> **What are ROMs?** ROM files are digital copies of game cartridges/discs. You'll need to obtain these yourself from games you own.

### 3. Emulator Detection
EasyEmu will scan your computer for installed emulators.

- **Green checkmark** = Emulator found and ready
- **Not Found** = You'll need to install this emulator (see next step)

Click **Next** to continue.

### 4. Install Missing Emulators
For any emulators you want to use:

1. Click **Download** to open the emulator's website
2. Download and install the emulator
3. Return to EasyEmu and click **Browse** to locate the emulator (if not auto-detected)

**Recommended emulators for beginners:**
| System | Recommended Emulator |
|--------|---------------------|
| NES, SNES, Game Boy | RetroArch |
| Nintendo 64 | Project64 or RetroArch |
| PlayStation 1 | DuckStation |
| PlayStation 2 | PCSX2 |
| GameCube/Wii | Dolphin |

Click **Next** when ready.

### 5. BIOS Files (Optional)
Some systems require BIOS files to work properly:
- **PlayStation** requires BIOS files
- **PlayStation 2** requires BIOS files
- Most Nintendo systems work without BIOS

> **Important:** BIOS files must be obtained from consoles you own. EasyEmu cannot provide these files.

Click **Next** to continue.

### 6. Setup Complete!
Click **Get Started** to enter your game library.

---

## Step 4: Playing Games

### Your Library
After setup, EasyEmu will scan your ROM folders and display your games with cover art.

### To Play a Game:
1. **With Mouse:** Click on any game to see its details, then click **Play**
2. **With Controller:**
   - Use the D-pad or left stick to navigate
   - Press **A** (Xbox) / **X** (PlayStation) to select
   - Press **B** (Xbox) / **O** (PlayStation) to go back

### Organizing Your Library
- **Search:** Type in the search bar to find games
- **Filter by Platform:** Click the platform dropdown to show only specific systems
- **Favorites:** Click the star on any game to add it to your favorites
- **View Modes:** Switch between grid and list view

---

## Using a Controller

EasyEmu works great with Xbox, PlayStation, and Nintendo controllers!

1. Connect your controller via USB or Bluetooth
2. EasyEmu will automatically detect it
3. You'll see a notification when your controller connects

**Basic Controls:**
| Action | Xbox | PlayStation | Nintendo |
|--------|------|-------------|----------|
| Navigate | D-Pad / Left Stick | D-Pad / Left Stick | D-Pad / Left Stick |
| Select/Confirm | A | X | B |
| Back/Cancel | B | O | A |
| Menu | Start | Options | + |

---

## Common Issues & Solutions

### "Emulator not found"
- Make sure the emulator is installed
- Click **Browse** in Settings > Emulators to manually locate the emulator executable

### "Game won't start"
- Check that the correct emulator is installed for that system
- For RetroArch: Make sure you've installed the required cores (see below)
- For PlayStation games: Ensure BIOS files are configured

### RetroArch Core Setup
RetroArch requires "cores" (individual emulators) to be installed:
1. Open RetroArch
2. Go to **Online Updater** > **Core Downloader**
3. Download cores for the systems you want to play:
   - NES: `FCEUmm` or `Nestopia`
   - SNES: `Snes9x` or `bsnes`
   - Game Boy: `Gambatte` or `mGBA`
   - Genesis: `Genesis Plus GX`

### Games not showing up
- Make sure your ROM files are in a folder you added during setup
- Go to **Settings** > **Library** and click **Rescan Library**
- Check that your ROM files have the correct extensions (.nes, .snes, .gba, etc.)

---

## Supported Systems

EasyEmu supports games from these platforms:

**Nintendo:**
- NES, SNES, Nintendo 64
- GameCube, Wii, Switch
- Game Boy, Game Boy Color, Game Boy Advance
- Nintendo DS, Nintendo 3DS

**Sega:**
- Genesis / Mega Drive
- Saturn, Dreamcast

**Sony:**
- PlayStation, PlayStation 2, PlayStation 3
- PlayStation Portable (PSP)

**Other:**
- Xbox (original)
- Arcade (MAME)

---

## Getting Help

- **Settings:** Access app settings from the sidebar (gear icon)
- **Rescan Library:** Settings > Library > Rescan if games are missing
- **Report Issues:** Open an [Issue](../../issues) if you run into problems

---

Enjoy your retro gaming!
