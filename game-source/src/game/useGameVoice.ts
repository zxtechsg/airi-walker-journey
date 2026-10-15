import { useCallback, useEffect, useRef, useState } from 'react';
export type GameIntent = 'dock' | 'help_stand' | 'unknown';
export type GameVoiceContext = 'seated' | 'recall' | 'other';
export type GameVoiceResult = { intent: GameIntent; text: string; source: string; model?: string; reason?: string };

/** GitHub Pages edition: no server, microphone, model or hardware calls. */
export function browserIntent(text: string, context: GameVoiceContext): GameVoiceResult {
  const value = text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ');
  const denied = /\b(dont|do not|never|cancel|stop|ignore|instead|homework|coffee|shopping|computer|taxes|cook)\b/.test(value);
  const dock = /\b(charge|charging|charger|dock|recharge|battery|top up)\b/.test(value);
  const help = /\b(help|assist|support|stand|standing|rise|ready|come|hand|get me up|get up)\b/.test(value);
  const intent: GameIntent = context === 'other' || denied || (dock && help) ? 'unknown' : dock && context === 'seated' ? 'dock' : help ? 'help_stand' : 'unknown';
  return { intent, text, source: 'browser_rules', ...(intent === 'unknown' ? {reason: 'Try “Go charge” or “Help me up”.'} : {}) };
}
export function useGameVoice({ context, onIntent }: {context: GameVoiceContext; onIntent: (result: GameVoiceResult) => void}) {
  const [text, setText] = useState(''), [error, setError] = useState('');
  const [transcript, setTranscript] = useState(''), [source, setSource] = useState('');
  const callback = useRef(onIntent); callback.current = onIntent;
  const clear = useCallback(() => {setText('');setError('');setTranscript('');setSource('');}, []);
  useEffect(clear, [context, clear]);
  const submitText = useCallback(async (value?: string) => {
    const request = (typeof value === 'string' ? value : text).trim();
    if (!request) {setError('Type a request first.');return;}
    const result = browserIntent(request, context);
    setTranscript(request);setSource('Browser command match');setError(result.reason || '');callback.current(result);
  }, [context, text]);
  const startListening = useCallback(async () => {setError('This web demo uses text. Type below or choose an example.');}, []);
  const stopListening = useCallback(async () => {}, []);
  return {text,setText,listening:false,busy:false,error,transcript,source,available:false,startListening,stopListening,submitText,clear};
}
