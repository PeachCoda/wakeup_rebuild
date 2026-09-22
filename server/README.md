# FakeUp 上课啦签到后端试验版

这个目录放的是 FakeUp 的上课啦后端代理试验版。它参考 `hdufuck/skl` 的请求模型，先实现两件事：

- 为每次请求生成新的 `skl-ticket`；
- 使用用户提供的上课啦 `sessionId` 校验登录态，并读取当天课程。

它暂时不在页面里直接提交密令签到。当前上课啦正式接口需要阿里验证码 SDK 产生的一次性 `captchaVerifyParam`，这个参数应该由官方页面/官方 SDK 产生，不能在后端随便伪造。`POST /api/signin/submit` 只在显式传入 `captchaVerifyParam` 时才会向正式接口提交。

本地启动：

```bash
node server/skl-proxy.mjs
```

Nginx 需要把 `/api/signin/` 反代到这个服务，例如：

```nginx
location /api/signin/ {
    proxy_pass http://127.0.0.1:8787/api/signin/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
