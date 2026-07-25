module.exports = {
  apps: [
    {
      name: 'projects-3000',
      cwd: '.',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3000',
      interpreter: 'C:/Program Files/nodejs/node.exe',
      env: { NODE_ENV: 'development' }
    }
  ]
};
