module.exports = {
  apps: [
    {
      name: 'mattyspins-api',
      script: 'dist/index.js',

      // Free Tier Optimizations (t2.micro: 1 vCPU, 1GB RAM)
      instances: 1, // Single instance only
      exec_mode: 'fork', // Fork mode uses less memory than cluster

      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Memory Management (Critical for t2.micro)
      max_memory_restart: '400M', // Restart if using >400MB (leave room for system)
      node_args: [
        '--max-old-space-size=512', // Limit Node.js heap to 512MB
        '--optimize-for-size', // Optimize for memory usage over speed
      ],

      // Logging (Minimal to save disk space)
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      log_type: 'json',

      // Process Management (Conservative for stability)
      autorestart: true,
      max_restarts: 3, // Limit restarts to prevent resource exhaustion
      min_uptime: '30s', // Longer uptime requirement
      restart_delay: 5000, // 5 second delay between restarts

      // Disable resource-intensive features
      watch: false, // No file watching
      ignore_watch: ['node_modules', 'logs', 'dist'],

      // Health Monitoring (Lightweight)
      health_check_grace_period: 5000,
      health_check_fatal_exceptions: true,

      // Environment Optimizations
      source_map_support: false, // Disable source maps in production

      // Process Limits
      kill_timeout: 3000, // Quick kill for faster restarts
      listen_timeout: 3000,

      // Free Tier Specific Settings
      cron_restart: '0 3 * * *', // Daily restart at 3 AM to clear memory

      // Error Handling
      exp_backoff_restart_delay: 100,
      max_memory_restart: '400M',

      // Logging Rotation (Save disk space)
      log_file_max_size: '10M',
      log_file_max_files: 3,

      // Performance Monitoring (Minimal)
      pmx: false, // Disable PMX monitoring to save resources

      // Instance Variables for Free Tier
      instance_var: 'INSTANCE_ID',

      // Graceful Shutdown
      kill_timeout: 5000,
      wait_ready: true,

      // Free Tier Resource Monitoring
      monitoring: {
        http: false, // Disable HTTP monitoring
        https: false, // Disable HTTPS monitoring
        port: false, // Disable port monitoring
      },
    },
  ],

  // Deploy Configuration for Free Tier
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-ec2-public-ip'], // Update with your EC2 IP
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/your-repo.git', // Update with your repo
      path: '/home/ubuntu/mattyspins',
      'post-deploy':
        'cd backend && npm ci --only=production && npm run build && pm2 reload ecosystem.free-tier.js --env production',
      'pre-setup': 'apt update && apt install git -y',

      // Free Tier Deploy Settings
      'deploy-timeout': 300000, // 5 minute timeout
      'max-deploys': 5, // Keep only 5 deployments to save disk space
    },
  },
};
