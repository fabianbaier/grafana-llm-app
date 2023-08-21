import React, { useState } from 'react';
import { useAsync } from 'react-use';

import { llms } from '@grafana/experimental';
import { PluginPage } from '@grafana/runtime';
import { Button, Input, Spinner } from '@grafana/ui';
import { finalize } from 'rxjs';

export function ExamplePage() {
  // The current input value.
  const [input, setInput] = React.useState('');
  // The final message to send to the LLM, updated when the button is clicked.
  const [message, setMessage] = React.useState('');
  // The latest reply from the LLM.
  const [reply, setReply] = useState('');

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false)

  const { loading, error, value } = useAsync(async () => {
    // Check if the LLM plugin is enabled and configured.
    // If not, we won't be able to make requests, so return early.
    const enabled = await llms.openai.enabled();
    if (!enabled) {
      return { enabled };
    }
    if (message === '') {
      return { enabled };
    }

    setStarted(true);
    setFinished(false);
    // Stream the completions. Each element is the next stream chunk.
    const stream = llms.openai.streamChatCompletions({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a cynical assistant.' },
        { role: 'user', content: message },
      ],
    }).pipe(
      // Accumulate the stream content into a stream of strings, where each
      // element contains the accumulated message so far.
      llms.openai.accumulateContent(),
      finalize(() => {
        setStarted(false);
        setFinished(true);
      })
    );
    // Subscribe to the stream and update the state for each returned value.
    return {
      enabled,
      stream: stream.subscribe(setReply),
    };
  }, [message]);

  if (error) {
    // TODO: handle errors.
    return null;
  }

  return (
    <PluginPage>
      {value?.enabled ? (
        <>
          <Input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Enter a message"
          />
          <br />
          <Button type="submit" onClick={() => setMessage(input)}>Submit</Button>
          <br />
          <div>{loading ? <Spinner /> : reply}</div>
          <div>{started ? "Response is started" : "Response is not started"}</div>
          <div>{finished ? "Response is finished" : "Response is not finished"}</div>
        </>
      ) : (
        <div>LLM plugin not enabled.</div>
      )}
    </PluginPage>
  );
}
