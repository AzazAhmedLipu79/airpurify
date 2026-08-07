function formatToMySQLDateTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function formatToMySQLDateTime3(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function get1MinBucket(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setSeconds(0, 0);
  return formatToMySQLDateTime(d);
}

function getHourlyBucket(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setMinutes(0, 0, 0);
  return formatToMySQLDateTime(d);
}

module.exports = {
  formatToMySQLDateTime,
  formatToMySQLDateTime3,
  get1MinBucket,
  getHourlyBucket,
};
