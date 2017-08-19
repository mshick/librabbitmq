import qs from 'qs';
import amqp from 'amqplib';
import defaultsDeep from 'lodash/defaultsDeep';
import retry from 'retry';
import isEmpty from 'lodash/isEmpty';
import get from 'lodash/get';
import uuid from 'uuid/v4';
import createChannel from './create-channel';

const getConnectionChannels = function (connection, openChannels) {
  return Object.keys(openChannels)
    .filter(channelName => {
      const connectName = get(openChannels, `${channelName}.connection._connectName`);
      return connectName === connection._connectName;
    })
    .map(channelName => openChannels[channelName]);
};

const keepConnectionAlive = function (openConnection, options, plugin) {
  const connectionName = openConnection._connectName;

  const onConnectionError = async () => {
    if (plugin.state._defaultConnection._connectName === connectionName) {
      plugin.state._defaultConnection = null;
    }

    const connectionOptions = defaultsDeep({}, {connectionName}, options);

    const connection = await createConnection(connectionOptions, plugin); // eslint-disable-line

    const connectionChannels = getConnectionChannels(connection, plugin.state._openChannels);

    const channelsCreated = connectionChannels.map(channel => {
      return createChannel({
        connection,
        name: channel.name,
        options: channel.options,
        persist: channel.persist
      }, plugin);
    });

    await Promise.all(channelsCreated);

    openConnection.removeListener('error', onConnectionError);
  };

  openConnection.on('error', onConnectionError);
};

const createConnection = async function (localOptions, plugin) {
  const {options: pluginOptions, state: pluginState} = plugin;
  const options = defaultsDeep({}, localOptions, pluginOptions);
  const {connectionName, url, connection: connectionOptions} = options;
  const {_openConnections, _defaultConnection} = pluginState;

  if (connectionOptions.useExisting && _defaultConnection) {
    return _defaultConnection;
  }

  const connectName = connectionName || uuid();
  const connectUrl = isEmpty(connectionOptions.tuning) ? url : `${url}?${qs.stringify(connectionOptions.tuning)}`;
  const operation = retry.operation(connectionOptions.retry);

  return new Promise((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const connection = await amqp.connect(connectUrl, connectionOptions.socket);
        connection._connectName = connectName;
        _openConnections[connectName] = connection;
        pluginState._defaultConnection = _defaultConnection || connection;
        keepConnectionAlive(connection, options, plugin);
        resolve(connection);
        return;
      } catch (error) {
        if (operation.retry(error)) {
          return;
        }
        reject(error);
      }
    });
  });
};

export default createConnection;
