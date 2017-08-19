import defaultsDeep from 'lodash/defaultsDeep';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';

const defaultExchangeOptions = {
  durable: false,
  autoDelete: false
};

const defaultMessageOptions = {
  expiration: 0,
  persistent: false,
  contentType: 'application/json',
  contentEncoding: 'utf-8'
};

const publishMessage = async function (args, plugin) {
  const {exchange, topic, payload, connection, options} = args;
  const {options: pluginOptions, state: pluginState} = plugin;
  const {preserveChannels} = pluginOptions;
  const {_openChannels} = pluginState;

  const {
    channelName: userChannelName,
    channelOptions,
    exchangeOptions: userExchangeOptions,
    messageOptions: userMessageOptions
  } = options || {};

  const channelName = userChannelName || getChannelName({method: 'publishMessage', exchange});

  const exchangeOptions = defaultsDeep({},
    userExchangeOptions,
    defaultExchangeOptions
  );

  const messageOptions = defaultsDeep({},
    userMessageOptions,
    defaultMessageOptions
  );

  messageOptions.type = topic;

  let channel;

  if (_openChannels[channelName]) {
    channel = _openChannels[channelName].channel;
  } else {
    channel = await createChannel({
      name: channelName,
      options: channelOptions,
      connection
    }, plugin);
  }

  await channel.assertExchange(exchange, 'topic', exchangeOptions);

  const published = await channel.publish(
    exchange,
    `${exchange}.${topic}`,
    new Buffer(JSON.stringify(payload), messageOptions.contentEncoding),
    messageOptions
  );

  if (!preserveChannels) {
    await channel.close();
  }

  return {
    channel,
    published
  };
};

export default publishMessage;
