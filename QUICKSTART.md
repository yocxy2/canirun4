# CanIRun.AI - Quick Start Scripts

Quick start scripts for **CanIRun.AI** - Local AI Model Compatibility Checker.

## 🚀 Quick Start

### Windows

#### Option 1: Double-click (Recommended)
Double-click `quickstart.bat` to automatically complete environment checks and startup.

#### Option 2: Command Line
```cmd
quickstart.bat
```

#### Option 3: PowerShell (Most Complete)
```powershell
# Allow local script execution (required for first run)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run script
.\quickstart.ps1
```

### macOS / Linux / WSL

```bash
# Option 1: Direct run
./quickstart.sh

# Option 2: Using bash
bash quickstart.sh

# Option 3: Using sh
sh quickstart.sh
```

## ✨ Script Functions

All quickstart scripts automatically complete the following steps:

1. **✅ Environment Check**
   - Check if Node.js is installed
   - Check pnpm (auto-install if not present)

2. **📦 Dependency Installation**
   - Run `pnpm install` if `node_modules` does not exist

3. **🚀 Start Service**
   - Start Next.js development server
   - Default address: http://localhost:3000

## ⚠️ Common Issues

### PowerShell Execution Policy Error

**Error Message:**
```
cannot be loaded because running scripts is disabled on this system
```

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use

If port 3000 is in use, Next.js will automatically try other ports (3001, 3002, etc.), or specify a port at startup:

```bash
pnpm dev -- --port 3001
```

### Dependency Installation Failure

If `pnpm install` fails, try the following steps:

```bash
# 1. Clear cache
pnpm store prune

# 2. Delete node_modules
rm -rf node_modules

# 3. Reinstall
pnpm install
```

## 🔧 Manual Start

If you don't want to use the scripts, you can start manually:

```bash
# 1. Install dependencies
pnpm install

# 2. Start development server
pnpm dev
```

## 📚 Project Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [pnpm Documentation](https://pnpm.io/)
- [Project README](./README.md)

---

**Happy Coding! 🎉**
