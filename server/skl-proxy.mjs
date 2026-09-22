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
const DATA_DIR = process.env.FAKEUP_SKL_DATA_DIR || path.join(ROOT_DIR, ".data", "skl-proxy");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SECRET_FILE = path.join(DATA_DIR, "secret.key");
const ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const MAX_BODY = 64 * 1024;
const SESSION_COOKIE = "fakeup_skl_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const state = { users: {}, sessions: {} };
let secretKeyPromise;
const loginAttempts = new Map();

function newTicket(size = 21) {
  const bytes = crypto.randomBytes(size);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte & 63];
  return out;
}

function now() {
  return Date.now();
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

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders
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

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
}

async function loadState() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object") {
      state.users = saved.users && typeof saved.users === "object" ? saved.users : {};
      state.sessions = saved.sessions && typeof saved.sessions === "object" ? saved.sessions : {};
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("load state failed", error.message);
  }
  pruneSessions();
}

async function saveState() {
  await ensureDataDir();
  const body = JSON.stringify(state, null, 2);
  await fs.writeFile(STATE_FILE, body, { mode: 0o600 });
}

async function getSecretKey() {
  if (secretKeyPromise) return secretKeyPromise;
  secretKeyPromise = (async () => {
    await ensureDataDir();
    try {
      const encoded = (await fs.readFile(SECRET_FILE, "utf8")).trim();
      const key = Buffer.from(encoded, "base64");
      if (key.length === 32) return key;
    } catch (error) {
      if (error.code !== "ENOENT") console.warn("read secret failed", error.message);
    }
    const key = crypto.randomBytes(32);
    await fs.writeFile(SECRET_FILE, key.toString("base64"), { mode: 0o600 });
    return key;
  })();
  return secretKeyPromise;
}

async function encryptText(text) {
  const key = await getSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

async function decryptText(payload) {
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("凭据格式无效");
  const key = await getSecretKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function parseCookies(req) {
  const out = {};
  for (const item of String(req.headers.cookie || "").split(";")) {
    const index = item.indexOf("=");
    if (index < 0) continue;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function cookieHeader(req, value, maxAge = SESSION_MAX_AGE_SEC) {
  const host = String(req.headers.host || "");
  const local = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const secure = local ? "" : "; Secure";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

function clearCookieHeader(req) {
  return cookieHeader(req, "", 0);
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

function checkLoginRate(req) {
  const ip = getClientIp(req) || "unknown";
  const windowMs = 15 * 60 * 1000;
  const limit = 8;
  const t = now();
  const attempts = (loginAttempts.get(ip) || []).filter((item) => t - item < windowMs);
  attempts.push(t);
  loginAttempts.set(ip, attempts);
  if (attempts.length > limit) {
    const error = new Error("登录尝试太频繁，请稍后再试");
    error.status = 429;
    throw error;
  }
}

function assertSameOrigin(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) return;
  const origin = req.headers.origin;
  if (!origin) return;
  const host = req.headers.host;
  const allowed = new Set([`https://${host}`, `http://${host}`]);
  if (!allowed.has(origin)) {
    const error = new Error("请求来源不匹配");
    error.status = 403;
    throw error;
  }
}

function pruneSessions() {
  const t = now();
  for (const [sid, session] of Object.entries(state.sessions)) {
    if (!session || Number(session.expiresAt || 0) <= t) delete state.sessions[sid];
  }
}

function createSession(username) {
  const sid = crypto.randomBytes(32).toString("base64url");
  state.sessions[sid] = { username, createdAt: now(), expiresAt: now() + SESSION_MAX_AGE_SEC * 1000 };
  return sid;
}

function getSession(req) {
  pruneSessions();
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (!sid) return null;
  const session = state.sessions[sid];
  if (!session || !state.users[session.username]) return null;
  return { sid, ...session, record: state.users[session.username] };
}

function deleteUserSessions(username) {
  for (const [sid, session] of Object.entries(state.sessions)) {
    if (session?.username === username) delete state.sessions[sid];
  }
}

function requestRaw(urlInput, { method = "GET", headers = {}, body, jar, follow = true, maxRedirects = 10, trace = [] } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlInput);
    const requestHeaders = { ...headers };
    const cookie = jar?.cookieHeader(url);
    if (cookie) requestHeaders.Cookie = cookie;
    const options = { method, headers: requestHeaders, timeout: 20000 };
    const req = https.request(url, options, (res) => {
      jar?.storeFrom(res.headers["set-cookie"], url);
      const chunks = [];
      let length = 0;
      res.on("data", (chunk) => {
        length += chunk.length;
        if (length > 8 * 1024 * 1024) {
          req.destroy(new Error("上游响应过大"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", async () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const location = res.headers.location ? new URL(res.headers.location, url).toString() : "";
        trace.push(url.toString());
        if (location) trace.push(location);
        if (follow && location && [301, 302, 303, 307, 308].includes(res.statusCode || 0) && maxRedirects > 0) {
          try {
            const nextMethod = [301, 302, 303].includes(res.statusCode || 0) ? "GET" : method;
            const nextBody = nextMethod === "GET" ? undefined : body;
            const nextHeaders = { ...headers };
            if (nextMethod === "GET") delete nextHeaders["Content-Type"];
            resolve(await requestRaw(location, { method: nextMethod, headers: nextHeaders, body: nextBody, jar, follow, maxRedirects: maxRedirects - 1, trace }));
          } catch (error) {
            reject(error);
          }
          return;
        }
        let json = null;
        if (text.trim()) {
          try { json = JSON.parse(text); } catch {}
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, text, json, url: url.toString(), location, trace });
      });
    });
    req.on("timeout", () => req.destroy(new Error("上游请求超时")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  storeFrom(setCookies, url) {
    const list = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
    const host = url.hostname;
    for (const raw of list) {
      const first = String(raw).split(";")[0];
      const index = first.indexOf("=");
      if (index <= 0) continue;
      const name = first.slice(0, index).trim();
      const value = first.slice(index + 1).trim();
      if (!name) continue;
      this.cookies.set(`${host}|${name}`, { host, name, value });
    }
  }
  cookieHeader(url) {
    const pairs = [];
    for (const cookie of this.cookies.values()) {
      if (url.hostname === cookie.host || url.hostname.endsWith(`.${cookie.host}`)) pairs.push(`${cookie.name}=${cookie.value}`);
    }
    return pairs.join("; ");
  }
}

function sklRequest({ method = "GET", path, query, token, contentType, userAgent }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const headers = { Accept: "application/json, text/plain, */*", Referer: `${BASE_URL}/index.html`, "User-Agent": userAgent || "FakeUp/skl-proxy (+https://kb.c0d4.ink)", "skl-ticket": newTicket() };
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
  return { id: user.id || "", userName: user.userName || user.teacherName || "", classNo: user.classNo || "", grade: user.grade || "", major: user.major || "", unitName: user.unitName || "", userType: user.userType || null };
}

function extractBetween(html, id) {
  const re = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([^<]*)<`, "i");
  const match = String(html || "").match(re);
  return match ? match[1].trim() : "";
}

function encryptPasswordForSso(cryptoKey, password) {
  const key = Buffer.from(cryptoKey, "base64");
  const algo = key.length === 16 ? "aes-128-ecb" : key.length === 24 ? "aes-192-ecb" : key.length === 32 ? "aes-256-ecb" : "";
  if (!algo) throw new Error("SSO 加密 key 长度异常");
  const cipher = crypto.createCipheriv(algo, key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]).toString("base64");
}

async function requestLoginUrl() {
  const resp = await sklRequest({ path: "/api/userinfo", query: { type: "", index: "index.html" } });
  const loginUrl = resp.json?.url;
  if (!loginUrl) throw new Error("上课啦没有返回 CAS 登录地址");
  return loginUrl;
}

async function resolveSsoLoginUrl(casUrl, jar, trace) {
  const resp = await requestRaw(casUrl, { jar, follow: false, trace });
  return resp.location || casUrl;
}

function extractSessionToken(trace) {
  for (const raw of [...trace].reverse()) {
    try {
      const url = new URL(raw);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const query = hash.startsWith("?") ? hash.slice(1) : hash;
      const token = new URLSearchParams(query).get("token");
      if (token) return token;
    } catch {}
  }
  return "";
}

async function loginToSkl(username, password) {
  const jar = new CookieJar();
  const trace = [];
  const casUrl = await requestLoginUrl();
  const ssoUrl = await resolveSsoLoginUrl(casUrl, jar, trace);
  const page = await requestRaw(ssoUrl, { jar, follow: true, trace, headers: { Referer: ssoUrl, "User-Agent": DEFAULT_UA } });
  const flowkey = extractBetween(page.text, "login-page-flowkey");
  const cryptoKey = extractBetween(page.text, "login-croypto");
  if (!flowkey || !cryptoKey) throw new Error("SSO 登录页没有返回 flowkey/crypto，可能需要验证码或学校登录页改版");
  const encryptedPassword = encryptPasswordForSso(cryptoKey, password);
  const form = new URLSearchParams({ username, type: "UsernamePassword", _eventId: "submit", geolocation: "", execution: flowkey, captcha_code: "", croypto: cryptoKey, password: encryptedPassword }).toString();
  const post = await requestRaw(ssoUrl, { method: "POST", body: form, jar, follow: false, trace, headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: ssoUrl, Origin: "https://sso.hdu.edu.cn", "User-Agent": DEFAULT_UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" } });
  if (![301, 302, 303].includes(post.status) || !post.location) throw new Error("SSO 登录失败，请检查学号密码，或确认是否触发验证码/风控");
  await requestRaw(post.location, { jar, follow: true, trace, headers: { "User-Agent": DEFAULT_UA } });
  const token = extractSessionToken(trace);
  if (!token) throw new Error("SSO 登录成功后没有拿到上课啦 token");
  const probe = await probeToken({ token });
  if (probe.status !== 200) throw new Error(probe.body?.message || "上课啦 token 校验失败");
  return { token, user: probe.body.user };
}

async function todayCoursesForToken(token, body = {}) {
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const coursesResp = await sklRequest({ path: "/api/course", query: { startTime: date }, token, userAgent: body.userAgent });
  return Array.isArray(coursesResp.json) ? coursesResp.json.map((course) => ({ courseId: course.courseId || "", courseName: course.courseName || "", classRoom: course.classRoom || "", teacherName: course.teacherName || "", weekDay: course.weekDay || null, startSection: course.startSection || null, endSection: course.endSection || null })) : [];
}

async function probeToken(body) {
  const token = String(body.token || "").trim();
  if (!token) return { status: 400, body: { ok: false, message: "缺少 sessionId" } };
  try {
    const userResp = await sklRequest({ path: "/api/userinfo", query: { type: "", index: "index.html" }, token, userAgent: body.userAgent });
    if (userResp.status !== 200 || !userResp.json || userResp.json.url) return { status: 401, body: { ok: false, message: "上课啦登录态无效或已过期", upstreamStatus: userResp.status } };
    return { status: 200, body: { ok: true, user: safeUser(userResp.json), message: "登录态有效" } };
  } catch (error) {
    return { status: 502, body: { ok: false, message: error.message || "上课啦接口暂时不可用" } };
  }
}

async function refreshTokenForRecord(record) {
  if (!record?.encryptedPassword || !record?.username) throw new Error("没有保存账号密码");
  const password = await decryptText(record.encryptedPassword);
  const result = await loginToSkl(record.username, password);
  record.token = await encryptText(result.token);
  record.user = result.user;
  record.updatedAt = now();
  await saveState();
  return result;
}

async function tokenForRecord(record) {
  if (record?.token) {
    const token = await decryptText(record.token);
    const probe = await probeToken({ token });
    if (probe.status === 200) return { token, user: probe.body.user };
  }
  return refreshTokenForRecord(record);
}

async function accountLogin(req) {
  checkLoginRate(req);
  const body = await readJson(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!/^\d{6,20}$/.test(username) || password.length < 1 || password.length > 128) return { status: 400, body: { ok: false, message: "学号或密码格式不对" } };
  const result = await loginToSkl(username, password);
  state.users[username] = { username, encryptedPassword: await encryptText(password), token: await encryptText(result.token), user: result.user, createdAt: state.users[username]?.createdAt || now(), updatedAt: now() };
  const sid = createSession(username);
  await saveState();
  return { status: 200, cookie: cookieHeader(req, sid), body: { ok: true, user: result.user, message: "已登录并保存凭据" } };
}

async function accountStatus(req) {
  const session = getSession(req);
  if (!session) return { status: 200, body: { ok: true, loggedIn: false } };
  try {
    const result = await tokenForRecord(session.record);
    return { status: 200, body: { ok: true, loggedIn: true, user: result.user || session.record.user || { id: session.username }, message: "登录态有效" } };
  } catch (error) {
    return { status: 401, body: { ok: false, loggedIn: false, message: error.message || "登录态失效" } };
  }
}

async function accountLogout(req) {
  const session = getSession(req);
  if (session) delete state.sessions[session.sid];
  await saveState();
  return { status: 200, cookie: clearCookieHeader(req), body: { ok: true, message: "已退出" } };
}

async function accountClear(req) {
  const session = getSession(req);
  if (session) {
    delete state.users[session.username];
    deleteUserSessions(session.username);
    await saveState();
  }
  return { status: 200, cookie: clearCookieHeader(req), body: { ok: true, message: "已清除服务端保存的凭据" } };
}

async function submitWithCaptcha(req, body) {
  const code = String(body.code || "").trim();
  const captchaVerifyParam = String(body.captchaVerifyParam || "").trim();
  if (!code) return { status: 400, body: { ok: false, message: "缺少密令" } };
  if (!captchaVerifyParam) return { status: 409, body: { ok: false, code: "captcha_required", message: "当前还不能直接提交密令：上课啦正式接口需要官方验证码参数。" } };
  let token = String(body.token || "").trim();
  const session = getSession(req);
  if (!token && session) token = (await tokenForRecord(session.record)).token;
  if (!token) return { status: 400, body: { ok: false, message: "缺少登录态" } };
  const userResp = await sklRequest({ path: "/api/userinfo", query: { type: "", index: "index.html" }, token, userAgent: body.userAgent });
  const userId = String(body.userId || userResp.json?.id || "");
  if (!userId) return { status: 401, body: { ok: false, message: "无法解析上课啦用户 ID" } };
  const resp = await sklRequest({ method: "POST", path: "/api/ali-nvc/captcha-verify", query: { captchaVerifyParam, userid: userId, code, latitude: body.latitude, longitude: body.longitude, t: Date.now() }, token, contentType: "application/x-www-form-urlencoded", userAgent: body.userAgent });
  return { status: resp.status || 502, body: { ok: Boolean(resp.json?.captchaVerifyResult && resp.json?.checkCodeDto), upstreamStatus: resp.status, result: resp.json || resp.text } };
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { ok: false, message: "方法不允许" });
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT_DIR, "." + pathname);
  if (!filePath.startsWith(ROOT_DIR + path.sep) && filePath !== ROOT_DIR) return sendJson(res, 403, { ok: false, message: "禁止访问" });
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
  assertSameOrigin(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/api/signin/health") return sendJson(res, 200, { ok: true, service: "fakeup-skl-proxy", mode: "account-session", message: "签到后端已连接；支持服务端保存凭据并自动刷新上课啦登录态。" });
  if (req.method === "POST" && url.pathname === "/api/signin/account/login") {
    const out = await accountLogin(req);
    return sendJson(res, out.status, out.body, out.cookie ? { "Set-Cookie": out.cookie } : {});
  }
  if (req.method === "GET" && url.pathname === "/api/signin/account/status") {
    const out = await accountStatus(req);
    return sendJson(res, out.status, out.body);
  }
  if (req.method === "POST" && url.pathname === "/api/signin/account/logout") {
    const out = await accountLogout(req);
    return sendJson(res, out.status, out.body, out.cookie ? { "Set-Cookie": out.cookie } : {});
  }
  if (req.method === "POST" && url.pathname === "/api/signin/account/clear") {
    const out = await accountClear(req);
    return sendJson(res, out.status, out.body, out.cookie ? { "Set-Cookie": out.cookie } : {});
  }
  if (req.method === "POST" && url.pathname === "/api/signin/token/probe") {
    const out = await probeToken(await readJson(req));
    return sendJson(res, out.status, out.body);
  }
  if (req.method === "POST" && url.pathname === "/api/signin/submit") {
    const out = await submitWithCaptcha(req, await readJson(req));
    return sendJson(res, out.status, out.body);
  }
  if (url.pathname.startsWith("/api/")) return sendJson(res, 404, { ok: false, message: "接口不存在" });
  return serveStatic(req, res, url);
}

await loadState();
const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    const status = Number(error.status || 500);
    const message = status >= 500 ? "服务异常" : (error.message || "请求失败");
    if (status >= 500) console.error(error);
    sendJson(res, status, { ok: false, message });
  });
});

server.listen(PORT, () => {
  console.log(`fakeup-skl-proxy listening on http://127.0.0.1:${PORT}`);
});
