#!/usr/bin/env node

// 简单的 HTTP 服务器用于测试 HabitTrack Outbox 系统
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const ROOT_DIR = __dirname;

// MIME 类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

// 获取文件 MIME 类型
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

// 创建服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // 默认文件
    if (pathname === '/') {
        pathname = '/index.html';
    }

    const filePath = path.join(ROOT_DIR, pathname);

    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 文件不存在
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>404 - File Not Found</title></head>
                    <body>
                        <h1>404 - File Not Found</h1>
                        <p>File: ${pathname}</p>
                        <p><a href="/">返回首页</a> | <a href="/test-outbox.html">测试页面</a></p>
                    </body>
                </html>
            `);
            return;
        }

        // 读取文件
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
                return;
            }

            // 设置 CORS 头（用于开发）
            res.writeHead(200, {
                'Content-Type': getMimeType(filePath),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });

            res.end(content);
        });
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`🚀 HabitTrack 测试服务器已启动`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`🔧 主应用: http://localhost:${PORT}/`);
    console.log(`🧪 测试页面: http://localhost:${PORT}/test-outbox.html`);
    console.log(`📊 监控面板: 主应用中按 Ctrl+O 打开`);
    console.log(`\n💡 提示:`);
    console.log(`  - 使用 Ctrl+C 停止服务器`);
    console.log(`  - 修改文件后刷新页面即可看到变化`);
    console.log(`  - 查看浏览器开发者工具获取详细日志`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});