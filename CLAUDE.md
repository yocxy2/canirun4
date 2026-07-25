# Project Configuration

## Quick Start

### Using Quickstart Scripts (Recommended)

Choose the appropriate script for your platform:

| Platform | Command |
|----------|---------|
| Windows (CMD) | `quickstart.bat` |
| Windows (PowerShell) | `powershell -ExecutionPolicy RemoteSigned -File quickstart.ps1` |
| macOS / Linux / WSL | `./quickstart.sh` |

All scripts will:
1. Check Node.js and pnpm installation
2. Install dependencies if needed
3. Check and free port 3000 if occupied
4. Start the development server at http://localhost:3000

### Manual Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## PM2 Services

| Port | Name | Type |
|------|------|------|
| 3000 | projects-3000 | Next.js |

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # First time
pm2 start all                    # After first time
pm2 stop all / pm2 restart all
pm2 start projects-3000 / pm2 stop projects-3000
pm2 logs / pm2 status / pm2 monit
pm2 save                         # Save process list
pm2 resurrect                    # Restore saved list
```

**Claude Commands:**
- `/pm2-all` - Start all services and open monitor
- `/pm2-all-stop` - Stop all services
- `/pm2-all-restart` - Restart all services
- `/pm2-3000` - Start service on port 3000
- `/pm2-3000-stop` - Stop service on port 3000
- `/pm2-3000-restart` - Restart service on port 3000
- `/pm2-logs` - View all logs
- `/pm2-status` - View PM2 status
