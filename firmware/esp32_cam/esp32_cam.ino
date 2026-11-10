#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "secrets.h"

// =======================
// RELAY + LED
// =======================
#define RELAY_PIN 13
#define LED_MERAH 12
#define LED_HIJAU 14

// =======================
// AI THINKER CAMERA PIN
// =======================
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

unsigned long lastManualPoll = 0;

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
  config.frame_size = FRAMESIZE_VGA; // Resolusi lebih tajam untuk scan barcode
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
  Serial.println("CONNECT WIFI");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi Connected");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("WiFi gagal");
  return false;
}

void openDoorCycle() {
  digitalWrite(LED_HIJAU, HIGH);
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(RELAY_PIN, LOW); // Relay aktif LOW -> solenoid terbuka
  delay(5000);
  digitalWrite(RELAY_PIN, HIGH); // Kunci kembali
  digitalWrite(LED_HIJAU, LOW);
}

String uploadPhoto(camera_fb_t *fb) {
  Serial.println("UPLOAD FOTO KE VERCEL");

  WiFiClientSecure client;
  client.setInsecure(); // Untuk prototipe/TA; untuk produksi gunakan Root CA

  HTTPClient http;
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
  if (!http.begin(client, String(BASE_URL) + path)) return;
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.POST("");
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_HIJAU, OUTPUT);

  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_HIJAU, LOW);

  if (!initCamera()) return;
  if (!connectWiFi()) return;

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Capture gagal");
    return;
  }

  String response = uploadPhoto(fb);
  esp_camera_fb_return(fb);

  if (response.indexOf("\"open_lock\":true") >= 0) {
    Serial.println("RESI VALID");
    openDoorCycle();
  } else {
    Serial.println("RESI TIDAK VALID");
    digitalWrite(LED_MERAH, HIGH);
    delay(3000);
    digitalWrite(LED_MERAH, LOW);
    digitalWrite(RELAY_PIN, HIGH);
  }
}

void loop() {
  // Polling perintah buka pintu manual dari dashboard setiap 3 detik
  if (WiFi.status() == WL_CONNECTED && millis() - lastManualPoll >= 3000) {
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

