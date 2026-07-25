Start all services and open PM2 monitor.
```bash
cd "E:\RAG\Daily Idea\本地 AI 部署评估工具\projects" && pm2 start ecosystem.config.cjs && start wt.exe -d "E:\RAG\Daily Idea\本地 AI 部署评估工具\projects" pwsh -NoExit -c "pm2 monit"
```
