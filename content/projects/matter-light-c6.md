---
title: "Đèn Matter over Thread với ESP32-C6"
summary: "Bóng đèn/công tắc Matter chạy qua mạng Thread, ghép đôi trực tiếp với Apple Home, Google Home hoặc Home Assistant."
protocol: "Matter over Thread"
chips: ["ESP32-C6", "ESP32-H2"]
difficulty: "easy"
timeMinutes: 30
features: ["Ghép đôi bằng mã QR Matter", "Chạy pin hoặc nguồn USB", "Điều khiển độ sáng", "OTA qua Matter"]
bom:
  - { name: "ESP32-C6-DevKitC-1", qty: 1 }
  - { name: "LED hoặc module relay 3.3V", qty: 1 }
  - { name: "Cáp USB-C", qty: 1 }
firmware: ["matter-light-c6"]
guides: ["bat-dau", "ghep-doi-matter"]
tags: ["matter", "thread", "đèn"]
accent: "mint"
icon: "💡"
featured: true
updatedAt: "2026-10-31"
---

## Giới thiệu

Dự án đèn Matter tối giản: một bo ESP32-C6, một LED. Sau khi flash, thiết bị quảng bá qua BLE để ghép đôi và tham gia mạng Thread của Border Router (Apple TV, HomePod, Google Nest Hub…).
