const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json());

const KEYS_FILE = "keys.json";
const SECRET = "DIAS2026";

const duracaoSegundos = {
  "1d": 86400,
  "3d": 259200,
  "7d": 604800,
  "30d": 2592000,
  "60d": 5184000,
  "perm": 999999999999,
};

function carregarKeys() {
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
}

function salvarKeys(keys) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function gerarKeyStr() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "DIAS";
  for (let i = 0; i < 4; i++) {
    key += "-";
    for (let j = 0; j < 4; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return key;
}

app.post("/criar-key", (req, res) => {
  const { duracao, secret } = req.body;
  if (secret !== SECRET) return res.json({ ok: false, erro: "Sem permissao" });
  if (!duracaoSegundos[duracao]) return res.json({ ok: false, erro: "Duracao invalida" });
  const keys = carregarKeys();
  const key = gerarKeyStr();
  const agora = Math.floor(Date.now() / 1000);
  const expira = agora + duracaoSegundos[duracao];
  keys[key] = { duracao: duracao, expira: expira, bloqueada: false, hwid: "" };
  salvarKeys(keys);
  res.json({ ok: true, key: key });
});

app.post("/validar-key", (req, res) => {
  const { key, hwid } = req.body;
  if (!key || !hwid) return res.json({ ok: false, motivo: "INVALIDA" });
  const keys = carregarKeys();
  const d = keys[key];
  if (!d) return res.json({ ok: false, motivo: "INVALIDA" });
  if (d.bloqueada) return res.json({ ok: false, motivo: "BLOQUEADA" });
  const agora = Math.floor(Date.now() / 1000);
  if (d.expira !== 999999999999 && agora > d.expira) {
    d.bloqueada = true;
    salvarKeys(keys);
    return res.json({ ok: false, motivo: "EXPIRADA" });
  }
  if (d.hwid === "") {
    d.hwid = hwid;
    salvarKeys(keys);
    return res.json({
