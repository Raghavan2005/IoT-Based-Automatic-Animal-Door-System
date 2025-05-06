#include <ESP32Servo.h>

// Pin definitions
#define SERVO_PIN 13       // Servo motor pin
#define IR_SENSOR_PIN 14   // IR sensor pin
#define BATTERY_PIN 34     // Analog pin for battery level monitoring

// Constants
const int OPEN_ANGLE = 90;   // Angle when gate is open
const int CLOSED_ANGLE = 0;  // Angle when gate is closed
const int DEFAULT_TIMEOUT = 10; // Default gate timeout in seconds

// Objects
Servo gateServo;           // Servo motor instance

// Variables
unsigned long gateOpenTime = 0;     // Time when gate was opened
bool gateIsOpen = false;            // Current state of gate
bool irSensorState = false;         // Current state of IR sensor
bool animalDetected = false;        // Flag for animal detection
int gateTimeout = DEFAULT_TIMEOUT;  // Gate timeout in seconds
int irSensitivity = 7;              // IR sensor sensitivity (1-10)
int batteryLevel = 100;             // Battery level percentage
String serialBuffer = "";           // Buffer for serial commands

// Timer for periodic status updates
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_UPDATE_INTERVAL = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("Animal Gate Control System Starting...");
  
  // Initialize Servo
  ESP32PWM::allocateTimer(0);
  gateServo.setPeriodHertz(50); // Standard 50Hz servo
  gateServo.attach(SERVO_PIN, 500, 2400); // Adjust min/max pulse width as needed
  
  // Initialize IR sensor as input
  pinMode(IR_SENSOR_PIN, INPUT);
  
  // Initialize with closed gate
  closeGate();
  
  // Send initial status
  sendStatusUpdate();
  
  Serial.println("Animal Gate Control System Ready!");
}

void loop() {
  // Check for incoming serial commands
  readSerialCommands();
  
  // Monitor IR sensor and detect animals
  monitorIRSensor();
  
  // Auto-close gate if timeout reached
  checkGateTimeout();
  
  // Send periodic status updates
  if (millis() - lastStatusUpdate > STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = millis();
    
    // Simulate battery drain (for demo purposes)
    simulateBatteryDrain();
  }
}

void readSerialCommands() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    
    // Add character to buffer unless it's a newline
    if (c != '\n') {
      serialBuffer += c;
    } 
    // Process command when newline is received
    else if (serialBuffer.length() > 0) {
      processCommand(serialBuffer);
      serialBuffer = ""; // Clear buffer
    }
  }
}

void processCommand(String command) {
  Serial.print("Received command: ");
  Serial.println(command);
  
  if (command == "OPEN") {
    openGate("MANUAL");
  } 
  else if (command == "CLOSE") {
    closeGate();
  } 
  else if (command == "STATUS") {
    sendStatusUpdate();
  } 
  else if (command.startsWith("TIMEOUT:")) {
    // Extract timeout value
    String timeoutStr = command.substring(8);
    int newTimeout = timeoutStr.toInt();
    
    if (newTimeout > 0) {
      gateTimeout = newTimeout;
      Serial.print("Gate timeout set to ");
      Serial.print(gateTimeout);
      Serial.println(" seconds");
    }
  }
  else if (command.startsWith("SENSITIVITY:")) {
    // Extract sensitivity value
    String sensStr = command.substring(12);
    int newSensitivity = sensStr.toInt();
    
    if (newSensitivity >= 1 && newSensitivity <= 10) {
      irSensitivity = newSensitivity;
      Serial.print("IR sensitivity set to ");
      Serial.println(irSensitivity);
    }
  }
}

void monitorIRSensor() {
  // Read current IR sensor state
  bool currentIRState = digitalRead(IR_SENSOR_PIN) == LOW; // Assuming LOW means triggered
  
  // Apply sensitivity - higher sensitivity means more likely to trigger
  // This is a simplified implementation - in real hardware this would need to be adjusted
  int randomNoise = random(1, 11); // Random number 1-10
  bool triggered = currentIRState || (randomNoise <= irSensitivity && random(1, 100) == 1);
  
  // Update global IR sensor state
  irSensorState = triggered;
  
  // Check for animal detection
  if (triggered && !animalDetected) {
    // Set animal detected flag
    animalDetected = true;
    
    // If gate is closed, open it
    if (!gateIsOpen) {
      openGate("IR");
    }
  } 
  else if (!triggered && animalDetected) {
    // Clear animal detected flag after a delay
    static unsigned long animalClearTime = 0;
    
    if (animalClearTime == 0) {
      animalClearTime = millis();
    } 
    else if (millis() - animalClearTime > 2000) { // 2 second delay
      animalDetected = false;
      animalClearTime = 0;
    }
  }
}

void openGate(String trigger) {
  if (!gateIsOpen) {
    gateServo.write(OPEN_ANGLE);
    gateIsOpen = true;
    gateOpenTime = millis();
    
    // Send event notification
    String direction = random(0, 2) == 0 ? "IN" : "OUT"; // Randomly choose direction
    Serial.print("EVENT:");
    Serial.print(direction);
    Serial.print(",");
    Serial.println(trigger);
    
    // Send updated status
    sendStatusUpdate();
  } else {
    // If gate already open, reset timer
    gateOpenTime = millis();
  }
}

void closeGate() {
  if (gateIsOpen) {
    gateServo.write(CLOSED_ANGLE);
    gateIsOpen = false;
    
    // Send updated status
    sendStatusUpdate();
  }
}

void checkGateTimeout() {
  if (gateIsOpen) {
    unsigned long timeElapsed = (millis() - gateOpenTime) / 1000; // Convert to seconds
    
    if (timeElapsed >= gateTimeout) {
      Serial.println("Gate timeout reached, closing gate");
      closeGate();
    }
  }
}

void sendStatusUpdate() {
  // Calculate time remaining if gate is open
  int timeRemaining = 0;
  if (gateIsOpen) {
    unsigned long timeElapsed = (millis() - gateOpenTime) / 1000; // Convert to seconds
    timeRemaining = gateTimeout - timeElapsed;
    if (timeRemaining < 0) timeRemaining = 0;
  }
  
  // Format and send status update
  Serial.print("STATUS:GATE:");
  Serial.print(gateIsOpen ? "OPEN" : "CLOSED");
  Serial.print(",IR:");
  Serial.print(irSensorState ? "1" : "0");
  Serial.print(",ANIMAL:");
  Serial.print(animalDetected ? "1" : "0");
  Serial.print(",BAT:");
  Serial.print(batteryLevel);
  Serial.print(",TIME:");
  Serial.println(timeRemaining);
  
  lastStatusUpdate = millis();
}

void simulateBatteryDrain() {
  // Decrease battery level slowly for demonstration
  if (random(1, 100) <= 10) { // 10% chance each status update
    batteryLevel -= 1;
    if (batteryLevel < 0) batteryLevel = 0;
  }
  
  // Battery recharges when very low (for demo purposes)
  if (batteryLevel < 10 && random(1, 100) <= 5) {
    batteryLevel += 20;
    if (batteryLevel > 100) batteryLevel = 100;
  }
}

int readBatteryLevel() {
  // In a real implementation, this would read from an analog pin
  // connected to the battery through a voltage divider
  int rawValue = analogRead(BATTERY_PIN);
  
  // Convert raw ADC value to percentage (this needs calibration for real hardware)
  int percentage = map(rawValue, 0, 4095, 0, 100);
  return constrain(percentage, 0, 100);
}