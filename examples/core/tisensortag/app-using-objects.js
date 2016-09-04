// Demo of extended BLE plugin API.

// Application code starts here. The code is wrapped in a
// function closure to prevent overwriting global objects.
;(function()
{

// UUIDs of services and characteristics.
var LUXOMETER_SERVICE = 'f000aa70-0451-4000-b000-000000000000'
var LUXOMETER_CONFIG = 'f000aa72-0451-4000-b000-000000000000'
var LUXOMETER_DATA = 'f000aa71-0451-4000-b000-000000000000'

function initialize()
{
	// Extend plugin API with new functions (see file new-api.js).
	extendBLEPluginAPI()

	// Start scanning for a device.
	findDevice()
}

function findDevice()
{
	showMessage('Scanning for the TI SensorTag CC2650...')

	// Start scanning. Two callback functions are specified.
	evothings.ble.startScan(
		deviceFound,
		scanError,
		{ serviceUUIDs: ['0000aa10-0000-1000-8000-00805f9b34fb'] })

	// This function is called when a device is detected, here
	// we check if we found the device we are looking for.
	function deviceFound(device)
	{
		// For debugging, print advertisement data.
		//console.log(JSON.stringify(device.advertisementData))

		// Alternative way to identify the device by advertised service UUID.
		/*
		if (device.advertisementData.kCBAdvDataServiceUUIDs.indexOf(
			'0000aa10-0000-1000-8000-00805f9b34fb') > -1)
		{
			showMessage('Found the TI SensorTag!')
		}
		*/

		if (device.advertisementData.kCBAdvDataLocalName == 'CC2650 SensorTag')
		{
			showMessage('Found the TI SensorTag!')

			// Stop scanning.
			evothings.ble.stopScan()

			// Connect.
			connectToDevice(device)
		}
	}

	// Function called when a scan error occurs.
	function scanError(error)
	{
		showMessage('Scan error: ' + error)
	}
}

function connectToDevice(device)
{
	evothings.ble.connect(device, connectSuccess, connectError)

	function connectSuccess(connectInfo)
	{
		if (connectInfo.state == evothings.ble.connectionState.STATE_CONNECTED)
		{
			showMessage('Connected to device, reading services...')

			// Read all services, characteristics and descriptors.
			evothings.ble.readAllServiceData(
				device,
				readServicesSuccess,
				readServicesError)
				// Options not implemented.
				// { serviceUUIDs: [LUXOMETER_SERVICE] }
		}
		if (connectInfo.state == evothings.ble.connectionState.STATE_DISCONNECTED)
		{
			showMessage('Device disconnected')
		}
	}

	function readServicesSuccess(services)
	{
		showMessage('Reading services completed')

		// Get Luxometer service and characteristics.
		var service = evothings.ble.getService(services, LUXOMETER_SERVICE)
		var configCharacteristic = evothings.ble.getCharacteristic(service, LUXOMETER_CONFIG)
		var dataCharacteristic = evothings.ble.getCharacteristic(service, LUXOMETER_DATA)

		// Enable notifications for Luxometer.
		enableLuxometerNotifications(device, configCharacteristic, dataCharacteristic)
	}

	function readServicesError(error)
	{
		showMessage('Read services error: ' + error)
	}

	// Function called when a connect error or disconnect occurs.
	function connectError(error)
	{
		showMessage('Connect error: ' + error)
	}
}

// Use notifications to get the luxometer value.
function enableLuxometerNotifications(device, configCharacteristic, dataCharacteristic)
{
	// Turn Luxometer ON.
	evothings.ble.writeCharacteristic(
		device,
		configCharacteristic,
		new Uint8Array([1]),
		turnOnLuxometerSuccess,
		turnOnLuxometerError)

	// Enable notifications from the Luxometer.
	evothings.ble.enableNotification(
		device,
		dataCharacteristic,
		readLuxometerSuccess,
		readLuxometerError)

	function turnOnLuxometerSuccess()
	{
		showMessage('Luxometer is ON')

	}
	function turnOnLuxometerError(error)
	{
		showMessage('Write Luxometer error: ' + error)
	}

	// Called repeatedly until disableNotification is called.
	function readLuxometerSuccess(data)
	{
		var lux = calculateLux(data)
		showMessage('Luxometer value: ' + lux)
	}

	function readLuxometerError(error)
	{
		showMessage('Read Luxometer error: ' + error)
	}
}

// Calculate the light level from raw sensor data.
// Return light level in lux.
function calculateLux(data)
{
	// Get 16 bit value from data buffer in little endian format.
	var value = new DataView(data).getUint16(0, true)

	// Extraction of luxometer value, based on sfloatExp2ToDouble
	// from BLEUtility.m in Texas Instruments TI BLE SensorTag
	// iOS app source code.
	var mantissa = value & 0x0FFF
	var exponent = value >> 12

	var magnitude = Math.pow(2, exponent)
	var output = (mantissa * magnitude)

	var lux = output / 100.0

	// Return result.
	return lux
}

function showMessage(text)
{
	document.querySelector('#message').innerHTML = text
	console.log(text)
}

// Start scanning for devices when the plugin has loaded.
document.addEventListener('deviceready', initialize, false)

})(); // End of closure.
