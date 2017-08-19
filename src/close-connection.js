const closeConnection = async function (options, globals) {
  const {state} = globals;

  const closingChannels = [];
  const closingConnections = [];

  for (const channelName of Object.keys(state._openChannels)) {
    closingChannels.push(state._openChannels[channelName].channel.close());
  }

  await Promise.all(closingChannels);

  state._openChannels = {};

  for (const connectionName of Object.keys(state._openConnections)) {
    closingConnections.push(state._openConnections[connectionName].close());
  }

  await Promise.all(closingConnections);

  state._openConnections = {};
  state._defaultConnection = null;

  return state;
};

export default closeConnection;
