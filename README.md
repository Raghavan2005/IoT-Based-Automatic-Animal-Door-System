
# 🚀 Project Title: IoT-Based Automatic Animal Door System

## 📌 Overview
The IoT-Based Automatic Animal Door System automates pet or livestock door access using sensors and smart controls. It ensures secure, scheduled, or sensor-based entry and exit without human intervention.

## 🧠 Key Features
- ✅ Real-time tracking , smart control
- ✅ Web App Integration / IoT Support
- ✅ Admin Dashboard / Analytics Dash
- ✅ User Friendly 

## 🛠️ Technologies Used

### 💻 Frontend
![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)

### ⚙️ Hardware
![ESP32](https://img.shields.io/badge/Hardware-ESP32-000000?logo=espressif&logoColor=white)
![Servo Motor](https://img.shields.io/badge/Hardware-Servo_Motor-F39C12?style=flat&logo=gear&logoColor=white)
![IR Sensor](https://img.shields.io/badge/Hardware-IR_Sensor-9B59B6?style=flat&logo=sensor&logoColor=white)
![MPU6050](https://img.shields.io/badge/Hardware-MPU6050-4CAF50?logo=raspberrypi&logoColor=white)
![RFID](https://img.shields.io/badge/Hardware-RFID-34495E?style=flat&logo=radio&logoColor=white)
![Load Sensor](https://img.shields.io/badge/Hardware-Load_Sensor-2ECC71?style=flat&logo=weight&logoColor=white)


## 🧩 Available Platforms
- 🌐 Web
- 🚀 Embedded (ESP32)

## ⚙️ System Architecture
> _There is no backend. I am directly connecting the ESP32 serial communication to the Next app to transfer the commands._
```mermaid
graph TD
  User -->|"UI Input"| Frontend
  Frontend -->|"API Calls"| ESP32_Serial_Connection
  Hardware -->|"Sensor Data"| Nextjs_APP
```

## 📸 Screenshots / Demo

| Dashboard | Hardware Setup |
|-----------|----------------|
| ![image](https://github.com/user-attachments/assets/49390ba9-6693-43b9-8652-b0201ca1ccf0)
![image](https://github.com/user-attachments/assets/6c962833-93e8-4641-86ea-09d4af160009)
![image](https://github.com/user-attachments/assets/1b5f2c29-d822-43b2-a13d-b33eccc31da9) | ![image](https://github.com/user-attachments/assets/ccf5d0fa-30cb-4092-9c3a-5de31020999a)|


## 📱 Installation & Setup

### Prerequisites
- [ ] Node.js 
- [ ] ESP32
- [ ] Visual Studio Code

### Setup Steps
```bash
# Clone the repository
git clone https://github.com/Raghavan2005/IoT-Based-Automatic-Animal-Door-System.git
cd IoT-Based-Automatic-Animal-Door-System

# Install dependencies
npm install         # For Node.js backend
npm run dev         # To Run the Project
```


## 📄 License
This project is licensed under the [MIT License](LICENSE).

