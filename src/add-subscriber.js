import defaultsDeep from 'lodash/defaultsDeep';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';
import subscriberConsumerFactory from './subscriber-consumer-factory';

const defaultExchangeOptions = {
  durable: false,
  autoDelete: false
};

const defaultQueueOptions = {
  exclusive: true,
  autoDelete: true
};

const defaultSubscriberOptions = {
  noAck: true,
  exclusive: true
};

const addSubscriber = async function (args, plugin) {
  try {
    const {connection, exchange, topic, subscriber, options} = args;
    const {state: pluginState} = plugin;
    const {_openChannels} = pluginState;

    const {
      channelName: userChannelName,
      channelOptions,
      exchangeOptions: userExchangeOptions,
      queueOptions: userQueueOptions,
      subscriberOptions: userSubscriberOptions
    } = options || {};

    const channelName = userChannelName || getChannelName({method: 'subscribeToMessages', exchange});
    const exchangeTopic = topic ? `${exchange}.${topic}` : `${exchange}.*`;

    const exchangeOptions = defaultsDeep({}, userExchangeOptions, defaultExchangeOptions);
    const queueOptions = defaultsDeep({}, userQueueOptions, defaultQueueOptions);
    const subscriberOptions = defaultsDeep({}, userSubscriberOptions, defaultSubscriberOptions);

    let activeChannel;

    if (_openChannels[channelName]) {
      activeChannel = _openChannels[channelName].channel;
    } else {
      activeChannel = await createChannel({
        name: channelName,
        options: channelOptions,
        persist: true,
        connection
      }, plugin);
    }

    await activeChannel.assertExchange(exchange, 'topic', exchangeOptions);

    const activeQueue = await activeChannel.assertQueue('', queueOptions);

    await activeChannel.bindQueue(activeQueue.queue, exchange, exchangeTopic);

    const consumer = subscriberConsumerFactory({
      subscriber,
      channel: activeChannel,
      queue: activeQueue,
      options: subscriberOptions
    });

    const consumed = await activeChannel.consume(activeQueue.queue, consumer, subscriberOptions);

    return {
      channel: activeChannel,
      queue: activeQueue,
      consumed
    };
  } catch (error) {
    throw error;
  }
};

export default addSubscriber;
