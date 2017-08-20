import defaultsDeep from 'lodash/defaultsDeep';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';

const defaultQueueOptions = {
  durable: true,
  maxPriority: 0
};

const pushTask = async function (args, plugin) {
  const {connection, queue: queueName, payload, type, correlationId, options} = args;
  const {options: pluginOptions, state: pluginState} = plugin;
  const {preserveChannels, retry: retryOptions} = pluginOptions;
  const {_openChannels} = pluginState;

  const {
    channelName: userChannelName,
    channelOptions,
    queueOptions,
    taskOptions
  } = options || {};

  let channel;

  try {
    const channelName = userChannelName || getChannelName({method: 'pushTask', queue: queueName});

    const defaultTaskOptions = {
      persistent: true,
      priority: 0,
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      headers: {
        'x-retry-count': retryOptions === false ? -1 : 0
      }
    };

    const mergedTaskOptions = defaultsDeep({}, taskOptions, defaultTaskOptions);

    if (type) {
      mergedTaskOptions.type = type;
    }

    if (correlationId) {
      mergedTaskOptions.correlationId = String(correlationId);
    }

    if (_openChannels[channelName]) {
      channel = _openChannels[channelName].channel;
    } else {
      channel = await createChannel({
        name: channelName,
        options: channelOptions,
        connection
      }, plugin);
    }

    const queue = await channel.assertQueue(
      queueName,
      defaultsDeep({}, queueOptions, defaultQueueOptions)
    );

    const queued = await channel.sendToQueue(
      queue.queue,
      new Buffer(JSON.stringify(payload), mergedTaskOptions.contentEncoding),
      mergedTaskOptions
    );

    if (!preserveChannels) {
      channel.close();
      return {
        queue,
        queued
      };
    }

    return {
      channel,
      queue,
      queued
    };
  } catch (error) {
    throw error;
  } finally {
    if (!preserveChannels && channel) {
      channel.close();
    }
  }
};

export default pushTask;
