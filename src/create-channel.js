import assert from 'assert';
import isEmpty from 'lodash/isEmpty';

const createChannel = async function (args, plugin) {
  const {name, options, persist} = args;
  const {options: pluginOptions, state: pluginState} = plugin;
  const {_openChannels, _defaultConnection} = pluginState;
  const {preserveChannels} = pluginOptions;
  const connection = args.connection || _defaultConnection;

  assert.ok(connection, 'You must create a connection before creating a channel');

  try {
    const channel = await connection.createChannel();

    if (options && !isEmpty(options)) {
      const optsSet = Object
        .keys(options)
        .map(opt => channel[opt](options[opt]));

      await Promise.all(optsSet);
    }

    if (preserveChannels || persist) {
      const oldChannel = _openChannels[name] && _openChannels[name].channel;

      _openChannels[name] = {
        connection,
        name,
        channel,
        options,
        persist
      };

      if (oldChannel) {
        await oldChannel.close();
      }
    }

    return channel;
  } catch (error) {
    throw error;
  }
};

export default createChannel;
