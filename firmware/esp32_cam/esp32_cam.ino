#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "secrets.h"

#define RELAY_PIN 13
#define LED_MERAH 12
#define LED_HIJAU 14
// GPIO 15 aman dipakai saat SD card tidak dimount; hubungkan tombol/sensor ke GND (aktif LOW).
#define TRIGGER_PIN 15

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const unsigned long MANUAL_POLL_INTERVAL_MS = 3000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;
const unsigned long SCAN_COOLDOWN_MS = 3000;
const unsigned long DEBOUNCE_MS = 50;
const bool SCAN_ON_BOOT = true;

unsigned long lastManualPoll = 0;
unsigned long lastWiFiRetry = 0;
unsigned long lastScanAt = 0;

bool lastRawTrigger = HIGH;
bool stableTrigger = HIGH;
unsigned long lastDebounceAt = 0;
bool cameraReady = false;

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init gagal: 0x%x\n", err);
    return false;
  }
  Serial.println("Camera OK");
  return true;
}

bool connectWiFi() {
  Serial.println("Menghubungkan WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi terhubung, IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("WiFi gagal terhubung");
  return false;
}

void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWiFiRetry < WIFI_RECONNECT_INTERVAL_MS) return;
  lastWiFiRetry = now;

  Serial.println("WiFi terputus, mencoba reconnect...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void openDoorCycle() {
  digitalWrite(LED_HIJAU, HIGH);
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(RELAY_PIN, LOW); // Relay aktif LOW membuka solenoid
  delay(5000);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_HIJAU, LOW);
}

void signalRejected() {
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_MERAH, HIGH);
  delay(3000);
  digitalWrite(LED_MERAH, LOW);
}

String uploadPhoto(camera_fb_t *fb) {
  Serial.println("Upload foto ke server...");

  WiFiClientSecure client;
  client.setInsecure(); // Untuk prototipe; ganti dengan Root CA untuk produksi

  HTTPClient http;
  http.setTimeout(15000);
  String url = String(BASE_URL) + "/api/upload-cam";
  if (!http.begin(client, url)) {
    Serial.println("HTTP begin gagal");
    return "";
  }

  String boundary = "----ESP32CAM";
  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"foto\"; filename=\"capture.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t totalLen = head.length() + fb->len + tail.length();
  uint8_t *body = (uint8_t *)malloc(totalLen);
  if (!body) {
    http.end();
    Serial.println("Alokasi memori gagal");
    return "";
  }

  memcpy(body, head.c_str(), head.length());
  memcpy(body + head.length(), fb->buf, fb->len);
  memcpy(body + head.length() + fb->len, tail.c_str(), tail.length());

  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("x-api-key", ESP32_API_KEY);

  int httpCode = http.POST(body, totalLen);
  free(body);

  String response = (httpCode > 0) ? http.getString() : "";
  http.end();

  Serial.printf("HTTP %d: %s\n", httpCode, response.c_str());
  return response;
}

String apiGet(const String &path) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, String(BASE_URL) + path)) return "";
  http.addHeader("x-api-key", ESP32_API_KEY);

  int code = http.GET();
  String body = (code > 0) ? http.getString() : "";
  http.end();
  return body;
}

void apiPostEmpty(const String &path) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, String(BASE_URL) + path)) return;
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.POST("");
  http.end();
}

void captureAndVerify() {
  if (!cameraReady) {
    Serial.println("Kamera belum siap");
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi belum terhubung, scan dibatalkan");
    signalRejected();
    return;
  }

  // Buang 1 frame lama di buffer DMA agar foto selalu kondisi terbaru
  camera_fb_t *stale = esp_camera_fb_get();
  if (stale) {
    esp_camera_fb_return(stale);
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Capture gagal");
    signalRejected();
    return;
  }

  String response = uploadPhoto(fb);
  esp_camera_fb_return(fb);
  lastScanAt = millis();

  if (response.indexOf("\"open_lock\":true") >= 0) {
    Serial.println("RESI VALID");
    openDoorCycle();
  } else {
    Serial.println("RESI TIDAK VALID / GAGAL");
    signalRejected();
  }
}

bool checkHardwareTrigger() {
  bool raw = digitalRead(TRIGGER_PIN);
  unsigned long now = millis();

  if (raw != lastRawTrigger) {
    lastDebounceAt = now;
    lastRawTrigger = raw;
  }

  if (now - lastDebounceAt >= DEBOUNCE_MS && raw != stableTrigger) {
    stableTrigger = raw;
    if (stableTrigger == LOW && now - lastScanAt >= SCAN_COOLDOWN_MS) {
      return true;
    }
  }
  return false;
}

bool checkSerialTrigger() {
  if (!Serial.available()) return false;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toUpperCase();
  return cmd == "SCAN" && (millis() - lastScanAt >= SCAN_COOLDOWN_MS);
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_HIJAU, OUTPUT);
  pinMode(TRIGGER_PIN, INPUT_PULLUP);

  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_HIJAU, LOW);

  cameraReady = initCamera();
  connectWiFi();

  if (SCAN_ON_BOOT && cameraReady && WiFi.status() == WL_CONNECTED) {
    captureAndVerify();
  }
}

void loop() {
  ensureWiFiConnected();

  if (checkHardwareTrigger() || checkSerialTrigger()) {
    captureAndVerify();
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastManualPoll >= MANUAL_POLL_INTERVAL_MS) {
    lastManualPoll = millis();
    String doorStatus = apiGet("/api/cek-manual");
    doorStatus.trim();
    if (doorStatus == "BUKA") {
      Serial.println("BUKA PINTU MANUAL");
      openDoorCycle();
      apiPostEmpty("/api/reset-manual");
    }
  }
}
