import {ACK, NACK} from './constants';

const consumerFactory = function (args) {
  const {channel, queue, subscriber, options} = args;
  const {noAck} = options || {};

  return async message => {
    try {
      const {content, properties} = message;
      const {contentType, contentEncoding} = properties;

      let payload = content.toString(contentEncoding);

      if (contentType === 'application/json') {
        payload = JSON.parse(payload);
      }

      const consumerObj = {
        raw: message,
        properties,
        payload,
        channel,
        queue
      };

      const resultCode = await subscriber(consumerObj);

      // Default assumes the reply was handled manually
      if (resultCode && !noAck) {
        if (resultCode === ACK) {
          channel.ack(message);
        } else if (resultCode === NACK) {
          channel.nack(message);
        }
      }
    } catch (error) {
      if (!noAck) {
        channel.nack(message);
      }
      throw error;
    }
  };
};

export default consumerFactory;
