const inLogs = async (logs, eventName) => {
  const event = logs.find(e => e.event === eventName);
  assert.isNotNull(event);
  assert.isDefined(event);
  return event;
};

module.exports = {
  inLogs,
};
