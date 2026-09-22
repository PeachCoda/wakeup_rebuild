import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const BASE_URL = "https://skl.hdu.edu.cn";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const MAX_BODY = 64 * 1024;

function newTicket(size = 21) {
  const bytes = crypto.randomBytes(size);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte & 63];
  return out;
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("请求体过大"), { status: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("JSON 格式错误"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sklRequest({ method = "GET", path, query, token, contentType, userAgent }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const headers = {
      Accept: "application/json, text/plain, */*",
      Referer: `${BASE_URL}/index.html`,
      "User-Agent": userAgent || "FakeUp/skl-proxy (+https://kb.c0d4.ink)",
      "skl-ticket": newTicket()
    };
    if (token) headers["X-Auth-Token"] = token;
    if (contentType) headers["Content-Type"] = contentType;

    const request = https.request(url, { method, headers, timeout: 15000 }, (response) => {
      const chunks = [];
      let length = 0;
      response.on("data", (chunk) => {
        length += chunk.length;
        if (length > 8 * 1024 * 1024) {
          request.destroy(new Error("上课啦响应过大"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        if (text.trim()) {
          try { json = JSON.parse(text); } catch {}
        }
        resolve({ status: response.statusCode || 0, headers: response.headers, text, json, url: url.toString() });
      });
    });
    request.on("timeout", () => request.destroy(new Error("上课啦请求超时")));
    request.on("error", reject);
    request.end();
  });
}

function safeUser(user) {
  if (!user || typeof user !== "object") return null;
  return {
    id: user.id || "",
    userName: user.userName || user.teacherName || "",
    classNo: user.classNo || "",
    grade: user.grade || "",
    major: user.major || "",
    unitName: user.unitName || "",
    userType: user.userType || null
  };
}

async function probeToken(body) {
  const token = String(body.token || "").trim();
  if (!token) return { status: 400, body: { ok: false, message: "缺少 sessionId" } };

  const userResp = await sklRequest({
    path: "/api/userinfo",
    query: { type: "", index: "index.html" },
    token,
    userAgent: body.userAgent
  });
  if (userResp.status !== 200 || !userResp.json || userResp.json.url) {
    return { status: 401, body: { ok: false, message: "上课啦登录态无效或已过期", upstreamStatus: userResp.status } };
  }

  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const coursesResp = await sklRequest({
    path: "/api/course",
    query: { startTime: date },
    token,
    userAgent: body.userAgent
  });
  const todayCourses = Array.isArray(coursesResp.json) ? coursesResp.json.map((course) => ({
    courseId: course.courseId || "",
    courseName: course.courseName || "",
    classRoom: course.classRoom || "",
    teacherName: course.teacherName || "",
    weekDay: course.weekDay || null,
    startSection: course.startSection || null,
    endSection: course.endSection || null
  })) : [];

  return {
    status: 200,
    body: {
      ok: true,
      user: safeUser(userResp.json),
      todayCourses,
      message: "登录态有效"
    }
  };
}

async function submitWithCaptcha(body) {
  const token = String(body.token || "").trim();
  const code = String(body.code || "").trim();
  const captchaVerifyParam = String(body.captchaVerifyParam || "").trim();
  if (!token || !code) return { status: 400, body: { ok: false, message: "缺少 sessionId 或密令" } };
  if (!captchaVerifyParam) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "captcha_required",
        message: "当前正式签到接口需要官方阿里验证码的一次性 captchaVerifyParam，页面不会绕过验证码直接提交。"
      }
    };
  }

  const userResp = await sklRequest({ path: "/api/userinfo", query: { type: "", index: "index.html" }, token, userAgent: body.userAgent });
  const userId = String(body.userId || userResp.json?.id || "");
  if (!userId) return { status: 401, body: { ok: false, message: "无法解析上课啦用户 ID" } };

  const resp = await sklRequest({
    method: "POST",
    path: "/api/ali-nvc/captcha-verify",
    query: {
      captchaVerifyParam,
      userid: userId,
      code,
      latitude: body.latitude,
      longitude: body.longitude,
      t: Date.now()
    },
    token,
    contentType: "application/x-www-form-urlencoded",
    userAgent: body.userAgent
  });

  return {
    status: resp.status || 502,
    body: {
      ok: Boolean(resp.json?.captchaVerifyResult && resp.json?.checkCodeDto),
      upstreamStatus: resp.status,
      result: resp.json || resp.text
    }
  };
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { ok: false, message: "方法不允许" });
  }
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT_DIR, "." + pathname);
  if (!filePath.startsWith(ROOT_DIR + path.sep) && filePath !== ROOT_DIR) {
    return sendJson(res, 403, { ok: false, message: "禁止访问" });
  }
  try {
    const data = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    if (req.method === "HEAD") return res.end();
    return res.end(data);
  } catch {
    return sendJson(res, 404, { ok: false, message: "文件不存在" });
  }
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/api/signin/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "fakeup-skl-proxy",
      mode: "token-probe-first",
      message: "签到后端已连接；已启用上课啦登录态校验，正式签到仍等待官方验证码接入。"
    });
  }
  if (req.method === "POST" && url.pathname === "/api/signin/token/probe") {
    const out = await probeToken(await readJson(req));
    return sendJson(res, out.status, out.body);
  }
  if (req.method === "POST" && url.pathname === "/api/signin/submit") {
    const out = await submitWithCaptcha(await readJson(req));
    return sendJson(res, out.status, out.body);
  }
  if (url.pathname.startsWith("/api/")) {
    return sendJson(res, 404, { ok: false, message: "接口不存在" });
  }
  return serveStatic(req, res, url);
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    const status = Number(error.status || 500);
    sendJson(res, status, { ok: false, message: error.message || "服务异常" });
  });
});

server.listen(PORT, () => {
  console.log(`fakeup-skl-proxy listening on http://127.0.0.1:${PORT}`);
});
