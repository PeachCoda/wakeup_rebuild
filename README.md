# 清课表网页

这是一个只保留课表本体的纯网页课表。WakeUp 课程表和 APK 解包内容只用于观察课表模块的交互与视觉风格；项目没有复制 APK 源码、图标、图片，也不包含广告、搜题、登录、会员等能力。

## 当前功能

- 周课表视图：只显示周一到周五，一天固定 13 节课。
- 学期固定 17 周，支持选择第几周、回到本周、显示/隐藏非本周课程。
- 固定上课时间段，课程卡片按节次高度对齐时间尺。
- 点击课程只查看详情：周数、时间、地点、老师、学分。
- 支持杭电教务系统课表导入、本站 JSON 导入导出。
- 数据保存在浏览器 `localStorage`，不上传教务账号密码。
- GitHub Pages 静态部署配置已准备好。

## 已剔除

- 搜题、作业、广告、会员、登录、推送、支付。
- 手动添加/编辑课程。
- 周六、周日栏位。
- 自定义一天节数、学期总周数、上课时间表。
- Android 桌面小组件和 APK 内置资源。

## 运行

项目没有构建依赖，直接用浏览器打开 `index.html` 即可。也可以在目录里启动一个静态服务器：

```bash
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.join(root,url.pathname==='/'?'index.html':url.pathname);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);});}).listen(5174,()=>console.log('http://localhost:5174'));"
```

然后访问：

```text
http://localhost:5174
```

## 部署

项目已经按 GitHub Pages 准备好：

- `.github/workflows/pages.yml`：推送到 `main` 后自动发布静态站。
- `CNAME`：当前预设为 `schedule.c0d4.ink`。
- `.nojekyll`：避免 GitHub Pages 按 Jekyll 处理静态文件。

GitHub 仓库里需要在 Settings → Pages 选择 GitHub Actions。域名 DNS 侧给 `schedule.c0d4.ink` 配一条指向 GitHub Pages 的记录即可。

## 代码结构

- `index.html`：页面骨架和弹窗结构。
- `styles.css`：布局、课表网格、课程卡片、弹窗和响应式样式。
- `app.js`：状态管理、导入解析、课程渲染和本地保存。
- `base/`：APK 解包内容，仅作为功能分析参考，不需要发布到网站。
