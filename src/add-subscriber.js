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

const addSubscriber = async function(args, plugin) {
  const { connection, exchange, topic, subscriber, options } = args;
  const { state: pluginState } = plugin;
  const { _openChannels } = pluginState;

  const {
    channelName: userChannelName,
    channelOptions,
    exchangeOptions: userExchangeOptions,
    queueOptions: userQueueOptions,
    subscriberOptions: userSubscriberOptions
  } =
    options || {};

  let channel;

  try {
    const channelName =
      userChannelName ||
      getChannelName({ method: 'subscribeToMessages', exchange });
    const exchangeTopic = topic ? `${exchange}.${topic}` : `${exchange}.*`;

    const exchangeOptions = defaultsDeep(
      {},
      userExchangeOptions,
      defaultExchangeOptions
    );
    const queueOptions = defaultsDeep(
      {},
      userQueueOptions,
      defaultQueueOptions
    );
    const subscriberOptions = defaultsDeep(
      {},
      userSubscriberOptions,
      defaultSubscriberOptions
    );

    if (_openChannels[channelName]) {
      channel = _openChannels[channelName].channel;
    } else {
      channel = await createChannel(
        {
          name: channelName,
          options: channelOptions,
          persist: true,
          connection
        },
        plugin
      );
    }

    await channel.assertExchange(exchange, 'topic', exchangeOptions);

    const queue = await channel.assertQueue('', queueOptions);

    await channel.bindQueue(queue.queue, exchange, exchangeTopic);

    const consumer = subscriberConsumerFactory({
      subscriber,
      channel,
      queue,
      options: subscriberOptions
    });

    const consumed = await channel.consume(
      queue.queue,
      consumer,
      subscriberOptions
    );

    return {
      channel,
      queue,
      consumed
    };
  } catch (error) {
    throw error;
  }
};

export default addSubscriber;
