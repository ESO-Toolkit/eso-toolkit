import {
  addAssistantMessage,
  addUserMessage,
  appendToLastAssistant,
  clearChat,
  deleteMessagePair,
  esoChatReducer,
  type EsoChatState,
  removeAssistantResponse,
  setError,
  setLastAssistantSources,
  setStreaming,
} from './esoChatSlice';

const initialState: EsoChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  statusText: null,
};

describe('esoChatSlice', () => {
  it('adds a user message', () => {
    const state = esoChatReducer(initialState, addUserMessage({ id: '1', content: 'Hello' }));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Hello');
    expect(state.error).toBeNull();
  });

  it('adds an assistant message', () => {
    const state = esoChatReducer(initialState, addAssistantMessage({ id: '2' }));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe('assistant');
    expect(state.messages[0].content).toBe('');
  });

  it('appends to last assistant message', () => {
    const withAssistant = esoChatReducer(initialState, addAssistantMessage({ id: '1' }));
    const state = esoChatReducer(withAssistant, appendToLastAssistant('Hello '));
    const state2 = esoChatReducer(state, appendToLastAssistant('world'));
    expect(state2.messages[0].content).toBe('Hello world');
  });

  it('does not append if last message is user', () => {
    const withUser = esoChatReducer(initialState, addUserMessage({ id: '1', content: 'Hi' }));
    const state = esoChatReducer(withUser, appendToLastAssistant('nope'));
    expect(state.messages[0].content).toBe('Hi');
  });

  it('sets sources on last assistant message', () => {
    const withAssistant = esoChatReducer(initialState, addAssistantMessage({ id: '1' }));
    const sources = { buildStats: [], knowledgeDocs: [{ title: 'Test', docType: 'trait', score: 0.9 }] };
    const state = esoChatReducer(withAssistant, setLastAssistantSources(sources));
    expect(state.messages[0].sources).toEqual(sources);
  });

  it('sets streaming state', () => {
    const state = esoChatReducer(initialState, setStreaming(true));
    expect(state.isStreaming).toBe(true);
  });

  it('sets error and stops streaming', () => {
    const streaming = esoChatReducer(initialState, setStreaming(true));
    const state = esoChatReducer(streaming, setError('Something broke'));
    expect(state.error).toBe('Something broke');
    expect(state.isStreaming).toBe(false);
  });

  it('clears chat to initial state', () => {
    let state = esoChatReducer(initialState, addUserMessage({ id: '1', content: 'Hi' }));
    state = esoChatReducer(state, setStreaming(true));
    state = esoChatReducer(state, clearChat());
    expect(state).toEqual(initialState);
  });

  it('clears error when new user message is added', () => {
    const withError = esoChatReducer(initialState, setError('old error'));
    const state = esoChatReducer(withError, addUserMessage({ id: '1', content: 'retry' }));
    expect(state.error).toBeNull();
  });

  describe('deleteMessagePair', () => {
    it('deletes user message and its following assistant response', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a1' }));
      state = esoChatReducer(state, addUserMessage({ id: 'u2', content: 'Next' }));
      state = esoChatReducer(state, deleteMessagePair('u1'));
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe('u2');
    });

    it('deletes assistant message and its preceding user message', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a1' }));
      state = esoChatReducer(state, deleteMessagePair('a1'));
      expect(state.messages).toHaveLength(0);
    });

    it('deletes only the user message when no assistant follows', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, deleteMessagePair('u1'));
      expect(state.messages).toHaveLength(0);
    });

    it('deletes only the assistant message when no user precedes', () => {
      let state = esoChatReducer(initialState, addAssistantMessage({ id: 'a1' }));
      state = esoChatReducer(state, deleteMessagePair('a1'));
      expect(state.messages).toHaveLength(0);
    });

    it('preserves surrounding messages when deleting from the middle', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'First' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a1' }));
      state = esoChatReducer(state, addUserMessage({ id: 'u2', content: 'Second' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a2' }));
      state = esoChatReducer(state, addUserMessage({ id: 'u3', content: 'Third' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a3' }));
      state = esoChatReducer(state, deleteMessagePair('u2'));
      expect(state.messages).toHaveLength(4);
      expect(state.messages.map((m) => m.id)).toEqual(['u1', 'a1', 'u3', 'a3']);
    });

    it('no-ops for unknown id', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, deleteMessagePair('unknown'));
      expect(state.messages).toHaveLength(1);
    });
  });

  describe('removeAssistantResponse', () => {
    it('removes the assistant message by id', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, addAssistantMessage({ id: 'a1' }));
      state = esoChatReducer(state, removeAssistantResponse('a1'));
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe('u1');
    });

    it('no-ops when given a user message id', () => {
      let state = esoChatReducer(initialState, addUserMessage({ id: 'u1', content: 'Hi' }));
      state = esoChatReducer(state, removeAssistantResponse('u1'));
      expect(state.messages).toHaveLength(1);
    });
  });
});
