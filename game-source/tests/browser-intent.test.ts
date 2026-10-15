import { describe, expect, it } from 'vitest';
import { browserIntent } from '../src/game/useGameVoice';
describe('public game text controls', () => {
  it.each(['help','kind of help','come help me out','get me up'] )('supports %s in both seated scenes', text => {
    expect(browserIntent(text,'seated').intent).toBe('help_stand');
    expect(browserIntent(text,'recall').intent).toBe('help_stand');
  });
  it('charges only when seated', () => {expect(browserIntent('go charge','seated').intent).toBe('dock');expect(browserIntent('go charge','recall').intent).toBe('unknown');});
  it.each(['do not help','help with homework','charge then help me up'])('rejects %s', text => {expect(browserIntent(text,'seated').intent).toBe('unknown');});
  it('does not claim AI inference or allow street commands', () => {expect(browserIntent('help','seated').source).toBe('browser_rules');expect(browserIntent('help','other').intent).toBe('unknown');});
});
