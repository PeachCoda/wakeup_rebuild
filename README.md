# FakeUp网页

这是一个只保留课表本体的纯网页课表。WakeUp 课程表和 APK 解包内容只用于观察课表模块的交互与视觉风格；项目没有复制 APK 源码、图标、图片，也不包含广告、搜题、登录、会员等能力。

## 当前功能

- 周课表视图：只显示周一到周五，一天固定 13 节课。
- 学期固定 17 周，支持选择第几周、回到本周、显示/隐藏非本周课程。
- 固定上课时间段，课程卡片按节次高度对齐时间尺。
- 点击课程只查看详情：周数、时间、地点、老师、学分。
- 支持杭电教务系统课表导入、本站 JSON 导入导出。
- 数据保存在浏览器 `localStorage`，不上传教务账号密码。

## 已剔除

- 搜题、作业、广告、会员、登录、推送、支付。
- 手动添加/编辑课程。
- 周六、周日栏位。
- 自定义一天节数、学期总周数、上课时间表。
- Android 桌面小组件和 APK 内置资源。

## 本地运行

项目没有构建依赖，直接用浏览器打开 `index.html` 即可。也可以在目录里启动一个静态服务器：

```bash
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.join(root,url.pathname==='/'?'index.html':url.pathname);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);});}).listen(5174,()=>console.log('http://localhost:5174'));"
```

然后访问：

```text
http://localhost:5174
```

## 部署到云服务器

这是纯静态网页。把下面这些文件上传到云服务器的站点目录即可：

- `index.html`
- `styles.css`
- `app.js`
- `docs/`

如果使用 Nginx，可以给新子域名配置一个静态站点，例如 `kb.c0d4.ink`：

```nginx
server {
    listen 80;
    server_name kb.c0d4.ink;

    root /var/www/kb.c0d4.ink;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

DNS 侧给新子域名添加一条记录，指向云服务器：

```text
kb.c0d4.ink  A  你的服务器 IPv4
```

如果服务器已有 HTTPS 证书管理工具，可以按现有博客站点的方式给新子域名签发证书。

## 代码结构

- `index.html`：页面骨架和弹窗结构。
- `styles.css`：布局、课表网格、课程卡片、弹窗和响应式样式。
- `app.js`：状态管理、导入解析、课程渲染和本地保存。
- `base/`：APK 解包内容，仅作为功能分析参考，不需要发布到网站。

