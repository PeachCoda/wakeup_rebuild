# FakeUp网页

这是一个只保留课表本体的网页课表。WakeUp 课程表和 APK 解包内容只用于观察课表模块的交互与视觉风格；项目没有复制 APK 源码、图标、图片，也不包含广告、搜题、会员、支付等能力。

## 当前功能

- 周课表视图：只显示周一到周五，一天固定 13 节课。
- 学期固定 17 周，支持选择第几周、回到本周、显示/隐藏非本周课程。
- 固定上课时间段，课程卡片按节次高度对齐时间尺。
- 点击课程查看详情：周数、时间、地点、老师、学分。
- 支持通过上课啦账号同步课表。
- 支持上课啦密令签到，前端通过 `/api/signin/` 调用本机后端代理。
- 课表数据保存在浏览器 `localStorage`；上课啦登录态和加密凭据由后端保存。

## 已剔除

- 搜题、作业、广告、会员、推送、支付。
- PDF 课表导入和旧调试面板。
- 手动添加/编辑课程。
- 周六、周日栏位。
- 自定义一天节数、学期总周数、上课时间表。
- Android 桌面小组件和 APK 内置资源。

## 本地运行

前端没有构建依赖，直接用浏览器打开 `index.html` 即可查看课表。需要同步课表或签到时，还要启动 `server/skl-proxy.mjs` 并把 `/api/signin/` 反代到它。

也可以在目录里启动一个静态服务器：

```bash
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.join(root,url.pathname==='/'?'index.html':url.pathname);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);});}).listen(5174,()=>console.log('http://localhost:5174'));"
```

然后访问：

```text
http://localhost:5174
```

## 部署到云服务器

静态文件放到站点目录，后端代理作为本机服务运行。当前线上使用 Nginx 把 `/api/signin/` 反代到 `127.0.0.1:8787`。

静态文件包括：

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `assets/`

后端相关文件：

- `server/skl-proxy.mjs`
- `deploy/fakeup-skl-proxy.service`
- `deploy/nginx-signin-location.conf`

## 代码结构

- `index.html`：页面骨架和弹窗结构。
- `styles.css`：布局、课表网格、课程卡片、弹窗和响应式样式。
- `app.js`：状态管理、课表同步、签到入口、课程渲染和本地保存。
- `server/`：上课啦登录、课表同步、密令签到代理。
- `deploy/`：systemd 和 Nginx 配置片段。
- `base/`：APK 解包内容，仅作为功能分析参考，不需要发布到网站。