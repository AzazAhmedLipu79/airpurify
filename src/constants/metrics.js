const METRICS = {
  TEMPERATURE_DS18B20: 'temperature_ds18b20',
  TEMPERATURE_DHT11: 'temperature_dht11',
  TEMPERATURE_TMP36: 'temperature_tmp36',
  HUMIDITY_DHT11: 'humidity_dht11',
  MQ135: 'mq135',
  PM25: 'pm25',
  PM10: 'pm10',
  CO2: 'co2',
};

const VALID_UNITS = ['C', 'F', 'K', '%', 'ppm', 'ppb', 'ug/m3', 'mg/m3'];

module.exports = {
  METRICS,
  VALID_UNITS,
};
