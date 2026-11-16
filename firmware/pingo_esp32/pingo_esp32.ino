/*
  Pingo - firmware ESP32 (Sistema Hídrico Inteligente) v1.2
  Bibliotecas: WiFiManager (tzapu), ArduinoJson (v7)
  Protocolo: ESP32 <-> Firestore via REST (HTTPS), autenticado como "<deviceId>@devices.pingo.app".
*/
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>
#include "config.h"

Preferences prefs;
String deviceId, devicePass, idToken;
unsigned long tokenObtainedAt = 0;

struct CycleCfg { String name; int durationMin; bool enabled; };
struct DeviceCfg {
  bool autoMode = true, reuseRinse = true, reuseMainWash = false, reuseFinalSpin = false;
  bool quickCycle = true, extraCycle = false;
  float machineKg = 0;
  CycleCfg cycles[8]; int cycleCount = 0;
} cfg;

// ---- estado da válvula ----
bool valveOn = false;          // estado real do relé
bool cmdOn = false;            // comando manual vindo do app
bool autoOpen = false;         // aberta pelo modo automático
bool failsafeTripped = false;
long lastSeq = -1;
unsigned long valveOpenedAt = 0;
time_t valveOpenedEpoch = 0;
uint32_t pulsesAtOpen = 0;
String currentCycleName = "Ciclo manual";
float totalLiters = 0;

// ---- nuvem ----
bool linked = false;           // documento do dispositivo existe (app já vinculou)
unsigned long lastPoll = 0, lastHeartbeat = 0, lastCloudOk = 0, lastWifiTry = 0;

// ---- sensor de fluxo / fases ----
volatile uint32_t pulses = 0;
void IRAM_ATTR onPulse() { pulses++; }
uint32_t lastPulsesSeen = 0;
unsigned long lastPulseAt = 0, lastDrainEnd = 0;
bool draining = false;
int drainIndex = 0;
const char* PHASE_NAMES[] = { "Ciclo manual", "Lavagem principal", "1º Enxágue", "2º Enxágue", "Centrifugação" };

// ---------------- util ----------------
bool timeOk() { return time(nullptr) > 1700000000; }

String isoNow(time_t t = 0) {
  if (!t) t = time(nullptr);
  struct tm tm; gmtime_r(&t, &tm);
  char b[25]; strftime(b, sizeof(b), "%Y-%m-%dT%H:%M:%SZ", &tm);
  return String(b);
}

uint32_t pulseCount() { noInterrupts(); uint32_t p = pulses; interrupts(); return p; }

String baseUrl() {
  return "https://firestore.googleapis.com/v1/projects/" FIREBASE_PROJECT_ID "/databases/(default)/documents";
}

// ---------------- válvula ----------------
void reportCycleEnd() {
  if (!timeOk()) return;
  float minutes = (millis() - valveOpenedAt) / 60000.0f;
  float liters;
#if USE_FLOW_SENSOR
  liters = (pulseCount() - pulsesAtOpen) / FLOW_PULSES_PER_LITER;
#else
  liters = minutes * FLOW_LITERS_PER_MIN;
#endif
  totalLiters += liters;
  prefs.putFloat("liters", totalLiters);

  JsonDocument d;
  JsonObject f = d["fields"].to<JsonObject>();
  f["cycleName"]["stringValue"] = currentCycleName;
  f["startedAt"]["timestampValue"] = isoNow(valveOpenedEpoch);
  f["endedAt"]["timestampValue"] = isoNow();
  f["liters"]["doubleValue"] = liters;
  f["durationMin"]["integerValue"] = String((int)(minutes + 0.5f));
  String body; serializeJson(d, body);
  int code = fsRequest("POST", baseUrl() + "/devices/" + deviceId + "/history", body, nullptr);
  Serial.printf("[history] %s HTTP %d (%.1f L)\n", currentCycleName.c_str(), code, liters);
}

void driveValve(bool on) {
  if (on == valveOn) return;
  digitalWrite(RELAY_PIN, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
  valveOn = on;
  if (on) {
    valveOpenedAt = millis(); valveOpenedEpoch = time(nullptr); pulsesAtOpen = pulseCount();
    if (!autoOpen) currentCycleName = PHASE_NAMES[0];
  } else if (valveOpenedAt) {
    reportCycleEnd(); valveOpenedAt = 0;
  }
  Serial.printf("[valve] %s\n", on ? "ABERTA" : "FECHADA");
  lastHeartbeat = 0;  // confirma o novo estado ao app imediatamente
}

// a válvula abre se o app mandou OU se o modo automático pediu
void applyValve() { driveValve(!failsafeTripped && (cmdOn || autoOpen)); }

// ---------------- modo automático (US05/US10) ----------------
bool captureThisDrain(int idx) {
  switch (idx) {
    case 1: return cfg.reuseMainWash;
    case 2: return cfg.reuseRinse && cfg.quickCycle;
    case 3: return cfg.reuseRinse && cfg.extraCycle;
    case 4: return cfg.reuseFinalSpin;
    default: return false;
  }
}

void autoLoop() {
#if USE_FLOW_SENSOR
  uint32_t p = pulseCount();
  unsigned long now = millis();
  if (p != lastPulsesSeen) {
    lastPulsesSeen = p; lastPulseAt = now;
    if (!draining) {                         // começou um escoamento
      draining = true;
      if (now - lastDrainEnd > NEW_WASH_IDLE_MS) drainIndex = 0;  // nova lavagem
      drainIndex++;
      Serial.printf("[auto] escoamento #%d\n", drainIndex);
      if (cfg.autoMode && captureThisDrain(drainIndex) && !failsafeTripped) {
        autoOpen = true;
        currentCycleName = PHASE_NAMES[drainIndex <= 4 ? drainIndex : 0];
        applyValve();
      }
    }
  } else if (draining && now - lastPulseAt > DRAIN_END_IDLE_MS) {  // terminou
    draining = false; lastDrainEnd = now;
    if (autoOpen) { autoOpen = false; applyValve(); }
  }
  if (!cfg.autoMode && autoOpen) { autoOpen = false; applyValve(); }  // usuário desligou o modo auto
#endif
}

// ---------------- autenticação ----------------
bool tryAuth(const char* endpoint) {
  WiFiClientSecure client; client.setInsecure();  // MVP: para produção use setCACert()
  HTTPClient http;
  http.setTimeout(8000); http.setConnectTimeout(5000);
  http.begin(client, String("https://identitytoolkit.googleapis.com/v1/accounts:") + endpoint + "?key=" FIREBASE_API_KEY);
  http.addHeader("Content-Type", "application/json");
  JsonDocument body;
  body["email"] = deviceId + "@devices.pingo.app";
  body["password"] = devicePass;
  body["returnSecureToken"] = true;
  String payload; serializeJson(body, payload);
  int code = http.POST(payload);
  String res = code > 0 ? http.getString() : "";
  http.end();
  if (code == 200) {
    JsonDocument r; deserializeJson(r, res);
    idToken = r["idToken"].as<String>();
    tokenObtainedAt = millis();
    return true;
  }
  JsonDocument e; deserializeJson(e, res);
  Serial.printf("[auth:%s] HTTP %d %s\n", endpoint, code, e["error"]["message"] | "(sem resposta)");
  return false;
}

String randomPassword() {
  const char* a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  String s; for (int i = 0; i < 24; i++) s += a[esp_random() % 56];
  return s;
}

bool signIn() {
  if (devicePass.length() && tryAuth("signInWithPassword")) { prefs.putBool("prov", true); return true; }
#if AUTO_PROVISION
  if (!prefs.getBool("prov", false)) {
    if (devicePass.length() == 0) { devicePass = randomPassword(); prefs.putString("devPass", devicePass); }
    Serial.println("[auth] criando conta do dispositivo (primeiro boot)...");
    if (tryAuth("signUp")) { prefs.putBool("prov", true); return true; }
    Serial.println("[auth] ID já registrado? Informe a senha no portal Wi-Fi (segure BOOT ao ligar).");
  }
#endif
  return false;
}

bool ensureToken() {
  if (idToken.length() && millis() - tokenObtainedAt < 50UL * 60UL * 1000UL) return true;
  return signIn();
}

// ---------------- Firestore REST ----------------
int fsRequest(const char* method, const String& url, const String& body, String* out) {
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.setTimeout(8000); http.setConnectTimeout(5000);
  http.begin(client, url);
  http.addHeader("Authorization", "Bearer " + idToken);
  http.addHeader("Content-Type", "application/json");
  int code = http.sendRequest(method, body);
  if (out && code > 0) *out = http.getString();
  http.end();
  if (code == 401) idToken = "";  // força novo login
  return code;
}

bool fBool(JsonVariant f, bool def) { return f["booleanValue"].is<bool>() ? f["booleanValue"].as<bool>() : def; }
float fNum(JsonVariant f, float def) {
  if (f["doubleValue"].is<float>()) return f["doubleValue"].as<float>();
  if (f["integerValue"].is<const char*>()) return atof(f["integerValue"].as<const char*>());
  return def;
}

// US05 + US10: lê command e config
bool pollDevice() {
  String res;
  int code = fsRequest("GET", baseUrl() + "/devices/" + deviceId, "", &res);
  if (code == 404) { if (linked) Serial.println("[poll] dispositivo sumiu"); linked = false; Serial.println("[poll] aguardando vínculo no app (ID: " + deviceId + ")"); return false; }
  if (code == 403) { linked = false; Serial.println("[poll] 403: regras do Firestore não publicadas ou ID de outro dono"); return false; }
  if (code != 200) { Serial.printf("[poll] HTTP %d\n", code); return false; }
  linked = true;

  JsonDocument doc;
  if (deserializeJson(doc, res)) return false;
  JsonVariant f = doc["fields"];

  JsonVariant cmd = f["command"]["mapValue"]["fields"];
  cmdOn = fBool(cmd["valveOn"], false);
  long seq = (long)fNum(cmd["seq"], 0);
  if (seq != lastSeq) failsafeTripped = false;  // novo comando do usuário destrava o failsafe
  lastSeq = seq;

  JsonVariant c = f["config"]["mapValue"]["fields"];
  cfg.autoMode       = fBool(c["autoMode"], cfg.autoMode);
  cfg.reuseRinse     = fBool(c["reuseRinse"], cfg.reuseRinse);
  cfg.reuseMainWash  = fBool(c["reuseMainWash"], cfg.reuseMainWash);
  cfg.reuseFinalSpin = fBool(c["reuseFinalSpin"], cfg.reuseFinalSpin);
  cfg.quickCycle     = fBool(c["quickCycle"], cfg.quickCycle);
  cfg.extraCycle     = fBool(c["extraCycle"], cfg.extraCycle);
  cfg.machineKg      = fNum(c["machineKg"], cfg.machineKg);

  cfg.cycleCount = 0;
  JsonArray arr = c["cycles"]["arrayValue"]["values"].as<JsonArray>();
  for (JsonVariant v : arr) {
    if (cfg.cycleCount >= 8) break;
    JsonVariant cf = v["mapValue"]["fields"];
    cfg.cycles[cfg.cycleCount++] = { String(cf["name"]["stringValue"] | "ciclo"), (int)fNum(cf["durationMin"], 0), fBool(cf["enabled"], false) };
  }
  lastCloudOk = millis();
  applyValve();
  return true;
}

// US06 + US11: heartbeat (substitui o mapa "status")
void sendHeartbeat() {
  JsonDocument d;
  JsonObject s = d["fields"]["status"]["mapValue"]["fields"].to<JsonObject>();
  s["valveOn"]["booleanValue"] = valveOn;
  s["lastSeen"]["timestampValue"] = isoNow();
  s["rssi"]["integerValue"] = String(WiFi.RSSI());
  s["firmware"]["stringValue"] = FIRMWARE_VERSION;
  s["totalLiters"]["doubleValue"] = totalLiters;
  String body; serializeJson(d, body);
  int code = fsRequest("PATCH", baseUrl() + "/devices/" + deviceId + "?updateMask.fieldPaths=status", body, nullptr);
  if (code == 200) lastCloudOk = millis(); else Serial.printf("[status] HTTP %d\n", code);
}

// ---------------- Wi-Fi (portal cativo) ----------------
void connectWifi() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[24]; snprintf(buf, sizeof(buf), "pingo-%02x%02x%02x", (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  String defaultId = String(buf);  // minúsculo, igual ao que o app grava
  String oldId = prefs.getString("devId", defaultId);
  deviceId = oldId;
  devicePass = prefs.getString("devPass", "");

  WiFiManagerParameter pId("devid", "ID do dispositivo (anote para vincular no app)", deviceId.c_str(), 40);
  WiFiManagerParameter pPass("devpass", "Senha do dispositivo (deixe como está para criar automaticamente)", devicePass.c_str(), 40);
  WiFiManager wm;
  wm.addParameter(&pId); wm.addParameter(&pPass);
  wm.setConfigPortalTimeout(300);
  wm.setSaveParamsCallback([&]() {
    String id = String(pId.getValue()); id.trim(); id.toLowerCase();
    if (id.length() < 6) id = defaultId;
    if (id != oldId) prefs.putBool("prov", false);   // outro ID => registra de novo
    prefs.putString("devId", id);
    prefs.putString("devPass", pPass.getValue());
  });

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    delay(3000);
    if (digitalRead(RESET_BUTTON_PIN) == LOW) { wm.resetSettings(); Serial.println("[wifi] credenciais apagadas"); }
  }
  if (!wm.autoConnect("Pingo-Setup", "pingo1234")) { ESP.restart(); }
  deviceId = prefs.getString("devId", defaultId);
  devicePass = prefs.getString("devPass", "");
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);  // válvula fechada ao ligar
#if USE_FLOW_SENSOR
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onPulse, RISING);
#endif
  prefs.begin("pingo", false);
  totalLiters = prefs.getFloat("liters", 0);

  connectWifi();
  WiFi.setAutoReconnect(true);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  unsigned long t0 = millis();
  while (!timeOk() && millis() - t0 < NTP_TIMEOUT_MS) delay(200);  // não trava se o NTP falhar
  Serial.printf("[boot] ID: %s | IP: %s | hora %s\n", deviceId.c_str(), WiFi.localIP().toString().c_str(), timeOk() ? "ok" : "sem NTP");
  lastCloudOk = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiTry > 10000) { lastWifiTry = millis(); WiFi.reconnect(); }

  unsigned long pollEvery = linked ? POLL_INTERVAL_MS : UNLINKED_POLL_MS;
  if (millis() - lastPoll >= pollEvery) {
    lastPoll = millis();
    if (WiFi.status() == WL_CONNECTED && ensureToken()) pollDevice();
  }
  if (linked && timeOk() && millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = millis();
    if (WiFi.status() == WL_CONNECTED && ensureToken()) sendHeartbeat();
  }

  autoLoop();

  // failsafes de segurança
  if (valveOn && millis() - valveOpenedAt > MAX_VALVE_OPEN_MS) { failsafeTripped = true; autoOpen = false; applyValve(); }
  if (valveOn && millis() - lastCloudOk > OFFLINE_FAILSAFE_MS && !autoOpen) { failsafeTripped = true; applyValve(); }

  delay(20);
}
