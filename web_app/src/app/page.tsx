'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, Battery, ArrowRightCircle, Eye, Settings, RefreshCw } from 'lucide-react';

interface GateStatus {
  isOpen: boolean;
  lastOpened: string | null;
  timeRemaining: number;
  irSensorState: boolean;
  animalDetected: boolean;
  batteryLevel: number;
}

interface AnimalEvent {
  id: number;
  timestamp: string;
  direction: 'in' | 'out';
  sensorTriggered: 'ir' | 'manual';
}

// Serial communication commands
const COMMANDS = {
  OPEN_GATE: 'OPEN',
  CLOSE_GATE: 'CLOSE',
  GET_STATUS: 'STATUS',
  SET_TIMEOUT: 'TIMEOUT:'
};

export default function AnimalGateDashboard() {
  // State management
  const [status, setStatus] = useState<GateStatus>({
    isOpen: false,
    lastOpened: null,
    timeRemaining: 0,
    irSensorState: false,
    animalDetected: false,
    batteryLevel: 85
  });
  
  const [animalEvents, setAnimalEvents] = useState<AnimalEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serialPort, setSerialPort] = useState<any>(null);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'settings'>('status');
  const [gateTimeout, setGateTimeout] = useState<number>(10);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
  
  // Serial communication functions
  const connectToSerial = async () => {
    if (!navigator.serial) {
      alert("Web Serial API not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    try {
      // Request port access
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      
      // Set up reader
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;
      
      // Set up writer
      const encoder = new TextEncoderStream();
      const writableStreamClosed = encoder.readable.pipeTo(port.writable);
      const writer = encoder.writable.getWriter();
      writerRef.current = writer;
      
      setSerialPort(port);
      setIsConnected(true);
      setSimulationMode(false);
      
      // Start reading from serial
      readSerialData();
      
      // Get initial status
      sendCommand(COMMANDS.GET_STATUS);
      
      console.log("Serial connection established!");
    } catch (error) {
      console.error("Serial connection failed:", error);
      alert("Failed to connect: " + error.message);
    }
  };
  
  const disconnectFromSerial = async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    
    if (writerRef.current) {
      await writerRef.current.close();
      writerRef.current = null;
    }
    
    if (serialPort) {
      await serialPort.close();
      setSerialPort(null);
    }
    
    setIsConnected(false);
    setSimulationMode(true);
  };
  
  const readSerialData = async () => {
    if (!readerRef.current) return;
    
    try {
      while (true) {
        const { value, done } = await readerRef.current.read();
        if (done) {
          break;
        }
        
        // Process the received data
        processSerialData(value);
      }
    } catch (error) {
      console.error("Error reading from serial:", error);
    } finally {
      setIsConnected(false);
    }
  };
  
  const processSerialData = (data: string) => {
    // Add to serial output log
    setSerialOutput(prev => [...prev, data].slice(-50));
    
    // Parse commands from ESP32
    if (data.includes("STATUS:")) {
      // Example format: "STATUS:OPEN,IR:1,ANIMAL:1,BAT:85,TIME:8"
      try {
        const statusData = data.split("STATUS:")[1].trim();
        const parts = statusData.split(",");
        
        const newStatus = { ...status };
        
        parts.forEach(part => {
          const [key, value] = part.split(":");
          
          switch (key) {
            case "GATE":
              newStatus.isOpen = value === "OPEN";
              if (newStatus.isOpen && !status.isOpen) {
                newStatus.lastOpened = new Date().toISOString();
              }
              break;
            case "IR":
              newStatus.irSensorState = value === "1";
              break;
            case "ANIMAL":
              newStatus.animalDetected = value === "1";
              break;
            case "BAT":
              newStatus.batteryLevel = parseInt(value);
              break;
            case "TIME":
              newStatus.timeRemaining = parseInt(value);
              break;
          }
        });
        
        setStatus(newStatus);
      } catch (e) {
        console.error("Error parsing status:", e);
      }
    } else if (data.includes("EVENT:")) {
      // Example format: "EVENT:IN,IR" or "EVENT:OUT,MANUAL"
      try {
        const eventData = data.split("EVENT:")[1].trim();
        const [direction, trigger] = eventData.split(",");
        
        if ((direction === "IN" || direction === "OUT") && 
            (trigger === "IR" || trigger === "MANUAL")) {
          addAnimalEvent(
            direction.toLowerCase() as 'in' | 'out',
            trigger.toLowerCase() as 'ir' | 'manual'
          );
        }
      } catch (e) {
        console.error("Error parsing event:", e);
      }
    }
  };
  
  const sendCommand = async (command: string) => {
    if (!writerRef.current || !isConnected) {
      console.error("Cannot send command - not connected");
      return;
    }
    
    try {
      await writerRef.current.write(command + "\n");
      console.log("Sent command:", command);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };
  
  // Simulation functions
  useEffect(() => {
    if (simulationMode) {
      const interval = setInterval(() => {
        simulateData();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [simulationMode]);
  
  const simulateData = () => {
    // Random chance of gate opening/closing and animal detection events
    const randomEvent = Math.random();
    
    if (randomEvent > 0.7) {
      if (!status.isOpen) {
        // Simulate gate opening
        const newStatus = {
          ...status,
          isOpen: true,
          lastOpened: new Date().toISOString(),
          timeRemaining: gateTimeout,
          irSensorState: true,
          animalDetected: true
        };
        setStatus(newStatus);
        
        // Add animal event
        const direction = Math.random() > 0.5 ? 'in' : 'out';
        addAnimalEvent(direction, 'ir');
        
        // Simulate gate closing after timeout
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            isOpen: false,
            timeRemaining: 0,
            irSensorState: false,
            animalDetected: false
          }));
        }, gateTimeout * 1000);
      }
    }
    
    // Slowly decrease battery level
    setStatus(prev => ({
      ...prev,
      batteryLevel: Math.max(prev.batteryLevel - 0.1, 0)
    }));
  };
  
  const addAnimalEvent = (direction: 'in' | 'out', sensor: 'ir' | 'manual') => {
    const newEvent: AnimalEvent = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      direction,
      sensorTriggered: sensor
    };
    
    setAnimalEvents(prev => [newEvent, ...prev].slice(0, 50));
  };
  
  // Control functions
  const toggleGate = () => {
    if (isConnected) {
      // Send command to ESP32
      sendCommand(status.isOpen ? COMMANDS.CLOSE_GATE : COMMANDS.OPEN_GATE);
      // Status will be updated when ESP32 responds
    } else {
      // Simulation mode
      if (status.isOpen) {
        setStatus({
          ...status,
          isOpen: false,
          timeRemaining: 0
        });
      } else {
        setStatus({
          ...status,
          isOpen: true,
          lastOpened: new Date().toISOString(),
          timeRemaining: gateTimeout
        });
        
        addAnimalEvent(Math.random() > 0.5 ? 'in' : 'out', 'manual');
        
        // Simulate auto close
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            isOpen: false,
            timeRemaining: 0
          }));
        }, gateTimeout * 1000);
      }
    }
  };
  
  const updateTimeout = (newTimeout: number) => {
    setGateTimeout(newTimeout);
    
    if (isConnected) {
      sendCommand(COMMANDS.SET_TIMEOUT + newTimeout);
    }
  };
  
  // Update time remaining counter in simulation mode
  useEffect(() => {
    if (simulationMode && status.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status.timeRemaining, simulationMode]);
  
  // Format timestamp for display
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <div className="min-h-screen text-black bg-gray-100">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Animal Gate Control System</h1>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-300' : 'bg-red-400'}`}></div>
            <span>{isConnected ? 'Connected via USB' : 'Disconnected'}</span>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'status' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'logs' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('logs')}
          >
            Activity Log
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'settings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
        
        {/* Status tab */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gate status card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Gate Status</h2>
                <div className="flex items-center">
                  <Battery className={`mr-2 ${status.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
                  <span>{status.batteryLevel.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-4">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${status.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-lg font-medium">{status.isOpen ? 'Open' : 'Closed'}</span>
                </div>
                
                <div className="flex items-center">
                  <Clock className="mr-3 text-gray-500" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">Last opened</div>
                    <div>{formatTime(status.lastOpened)}</div>
                  </div>
                </div>
                
                {status.isOpen && (
                  <div className="flex items-center">
                    <RefreshCw className="mr-3 text-gray-500" size={20} />
                    <div>
                      <div className="text-sm text-gray-500">Auto-close in</div>
                      <div>{status.timeRemaining} seconds</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Eye className="mr-3 text-gray-500" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">IR Sensor</div>
                    <div className={status.irSensorState ? 'text-green-600' : 'text-gray-600'}>
                      {status.irSensorState ? 'Triggered' : 'Clear'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${status.animalDetected ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                  <span>{status.animalDetected ? 'Animal detected' : 'No animals detected'}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button 
                  onClick={toggleGate}
                  className={`w-full py-2 px-4 rounded-md font-medium ${
                    status.isOpen 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {status.isOpen ? 'Close Gate' : 'Open Gate'}
                </button>
              </div>
            </div>
            
            {/* USB Connection Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">USB Connection</h2>
              
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Connection Status</div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span>{isConnected ? 'Connected to ESP32' : 'Not Connected'}</span>
                  <button 
                    onClick={isConnected ? disconnectFromSerial : connectToSerial}
                    className={`${
                      isConnected 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white py-1 px-3 rounded-md text-sm`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect via USB'}
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Serial Monitor</div>
                <div className="bg-black text-green-400 p-2 rounded-md h-40 overflow-y-auto font-mono text-xs">
                  {serialOutput.length === 0 ? (
                    <div className="text-gray-500 italic">No serial output yet...</div>
                  ) : (
                    serialOutput.map((line, i) => (
                      <div key={i}>&gt; {line}</div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Mode</div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span>{simulationMode ? 'Simulation Mode' : 'Hardware Mode'}</span>
                  <div className="relative inline-block w-12 h-6">
                    <input 
                      type="checkbox" 
                      className="opacity-0 w-0 h-0" 
                      checked={simulationMode}
                      onChange={() => {
                        if (isConnected) {
                          alert("Please disconnect from USB first");
                          return;
                        }
                        setSimulationMode(!simulationMode);
                      }}
                      id="simulation-toggle"
                    />
                    <label 
                      htmlFor="simulation-toggle"
                      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                        simulationMode ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute w-4 h-4 bottom-1 transition-all duration-300 bg-white rounded-full ${
                        simulationMode ? 'left-7' : 'left-1'
                      }`}></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Logs tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Log</h2>
            
            {animalEvents.length === 0 ? (
              <p className="text-gray-500 py-4">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {animalEvents.map(event => (
                  <div key={event.id} className="py-3 flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                      event.direction === 'in' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <ArrowRightCircle size={16} className={event.direction === 'out' ? 'rotate-180' : ''} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">
                        Animal {event.direction === 'in' ? 'entered' : 'exited'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()} • 
                        {event.sensorTriggered === 'ir' ? ' Automatic detection' : ' Manual control'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">System Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gate Open Duration
                </label>
                <select 
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  value={gateTimeout}
                  onChange={(e) => updateTimeout(parseInt(e.target.value))}
                >
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                  <option value="20">20 seconds</option>
                  <option value="30">30 seconds</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IR Sensor Sensitivity
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value="7" 
                  className="w-full"
                  onChange={(e) => {
                    if (isConnected) {
                      sendCommand("SENSITIVITY:" + e.target.value);
                    }
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="font-medium text-lg mb-4">ESP32 Configuration</h3>
                
                <div className="bg-gray-50 p-4 rounded-md text-sm">
                  <p className="mb-3">To ensure your ESP32 works with this interface, update your Arduino code to handle these serial commands:</p>
                  
                  <ul className="list-disc ml-5 space-y-2 mb-3">
                    <li><code className="bg-gray-200 px-1 rounded">OPEN</code> - Open the gate</li>
                    <li><code className="bg-gray-200 px-1 rounded">CLOSE</code> - Close the gate</li>
                    <li><code className="bg-gray-200 px-1 rounded">STATUS</code> - Request current status</li>
                    <li><code className="bg-gray-200 px-1 rounded">TIMEOUT:10</code> - Set gate timeout (in seconds)</li>
                    <li><code className="bg-gray-200 px-1 rounded">SENSITIVITY:7</code> - Set IR sensitivity (1-10)</li>
                  </ul>
                  
                  <p className="mb-3">Your ESP32 should respond with:</p>
                  
                  <ul className="list-disc ml-5 space-y-2">
                    <li><code className="bg-gray-200 px-1 rounded">STATUS:GATE:OPEN,IR:1,ANIMAL:1,BAT:85,TIME:8</code> - Status update</li>
                    <li><code className="bg-gray-200 px-1 rounded">EVENT:IN,IR</code> or <code className="bg-gray-200 px-1 rounded">EVENT:OUT,MANUAL</code> - Animal events</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-gray-800 text-gray-400 py-4 mt-8">
        <div className="container mx-auto text-center text-sm">
          Animal Gate Control System &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}