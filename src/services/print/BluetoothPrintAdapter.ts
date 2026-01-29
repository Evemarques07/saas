/**
 * Bluetooth Print Adapter
 * Handles printing to thermal printers via Web Bluetooth API
 */

// Common Bluetooth printer service UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Common thermal printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Another common UUID
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Write characteristic
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // Common write characteristic
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Another common UUID
];

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

export interface BluetoothPrintResult {
  success: boolean;
  error?: string;
}

// Store connected printer
let connectedDevice: BluetoothDevice | null = null;
let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Check if we have a connected printer
 */
export function isConnected(): boolean {
  return connectedDevice !== null &&
         connectedDevice.gatt?.connected === true &&
         writeCharacteristic !== null;
}

/**
 * Get connected printer info
 */
export function getConnectedPrinter(): BluetoothPrinterDevice | null {
  if (!connectedDevice) return null;

  return {
    id: connectedDevice.id,
    name: connectedDevice.name || 'Impressora Bluetooth',
    connected: connectedDevice.gatt?.connected || false,
  };
}

/**
 * Request and connect to a Bluetooth printer
 */
export async function connectPrinter(): Promise<BluetoothPrintResult> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: 'Bluetooth nao suportado neste navegador. Use Chrome ou Edge.',
    };
  }

  try {
    // Request device with printer services
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: PRINTER_SERVICE_UUIDS },
        { namePrefix: 'Printer' },
        { namePrefix: 'POS' },
        { namePrefix: 'BT' },
        { namePrefix: 'MTP' },
        { namePrefix: 'MPT' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'XP-' },
        { namePrefix: 'ZJ-' },
        { namePrefix: 'PT-' },
      ],
      optionalServices: PRINTER_SERVICE_UUIDS,
    }).catch(() => {
      // Fallback: accept any device if filters don't match
      return navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });
    });

    if (!device) {
      return { success: false, error: 'Nenhum dispositivo selecionado' };
    }

    // Connect to GATT server
    const server = await device.gatt?.connect();
    if (!server) {
      return { success: false, error: 'Erro ao conectar ao dispositivo' };
    }

    // Find the write characteristic
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(serviceUuid);

        for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
          try {
            characteristic = await service.getCharacteristic(charUuid);
            if (characteristic) break;
          } catch {
            // Try next characteristic
          }
        }

        if (!characteristic) {
          // Try to get any writable characteristic
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
        }

        if (characteristic) break;
      } catch {
        // Try next service
      }
    }

    if (!characteristic) {
      await server.disconnect();
      return {
        success: false,
        error: 'Impressora nao compativel. Caracteristica de escrita nao encontrada.',
      };
    }

    // Store connection
    connectedDevice = device;
    writeCharacteristic = characteristic;

    // Listen for disconnection
    device.addEventListener('gattserverdisconnected', () => {
      console.log('[Bluetooth] Printer disconnected');
      connectedDevice = null;
      writeCharacteristic = null;
    });

    return { success: true };
  } catch (error) {
    console.error('[Bluetooth] Connection error:', error);

    if (error instanceof Error) {
      if (error.message.includes('User cancelled')) {
        return { success: false, error: 'Selecao cancelada' };
      }
      if (error.message.includes('Bluetooth adapter not available')) {
        return { success: false, error: 'Bluetooth nao disponivel no dispositivo' };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao conectar',
    };
  }
}

/**
 * Disconnect from printer
 */
export async function disconnectPrinter(): Promise<void> {
  if (connectedDevice?.gatt?.connected) {
    connectedDevice.gatt.disconnect();
  }
  connectedDevice = null;
  writeCharacteristic = null;
}

/**
 * Send data to printer
 */
export async function printData(data: Uint8Array): Promise<BluetoothPrintResult> {
  if (!isConnected() || !writeCharacteristic) {
    return {
      success: false,
      error: 'Impressora nao conectada. Conecte uma impressora primeiro.',
    };
  }

  try {
    // Send data in chunks (max 512 bytes per write for most BLE devices)
    const CHUNK_SIZE = 512;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, data.length));

      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }

      // Small delay between chunks to prevent buffer overflow
      if (i + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[Bluetooth] Print error:', error);

    // Check if disconnected
    if (!connectedDevice?.gatt?.connected) {
      connectedDevice = null;
      writeCharacteristic = null;
      return {
        success: false,
        error: 'Impressora desconectada. Reconecte e tente novamente.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao imprimir',
    };
  }
}

/**
 * Reconnect to a previously paired device
 */
export async function reconnectPrinter(deviceId: string): Promise<BluetoothPrintResult> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: 'Bluetooth nao suportado',
    };
  }

  try {
    // Get devices that were previously paired
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return {
        success: false,
        error: 'Dispositivo nao encontrado. Pareie novamente.',
      };
    }

    // Connect
    const server = await device.gatt?.connect();
    if (!server) {
      return { success: false, error: 'Erro ao reconectar' };
    }

    // Find characteristic (same logic as connectPrinter)
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();

        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            break;
          }
        }

        if (characteristic) break;
      } catch {
        // Try next service
      }
    }

    if (!characteristic) {
      await server.disconnect();
      return { success: false, error: 'Caracteristica de escrita nao encontrada' };
    }

    connectedDevice = device;
    writeCharacteristic = characteristic;

    device.addEventListener('gattserverdisconnected', () => {
      connectedDevice = null;
      writeCharacteristic = null;
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reconectar',
    };
  }
}
