import type { PhaseSchedule } from './phase.ts';

/**
 * Inline classic script that sets <html data-phase> before first paint.
 * It mirrors getPhase() and parsePhaseOverride(); prepaint.test.ts proves they agree.
 */
export function buildPrePaintScript(schedule: PhaseSchedule): string {
  return [
    '(function(){try{',
    `var s=${JSON.stringify(schedule)};`,
    "var names=['night','day','noon','evening'];",
    "var p=null;var q=new URLSearchParams(window.location.search).get('phase');",
    'if(q!==null){q=q.trim().toLowerCase();if(names.indexOf(q)>-1){p=q;}else if(/^[0-3]$/.test(q)){p=names[Number(q)];}}',
    'if(!p){var d=new Date();var h=d.getHours()+d.getMinutes()/60;',
    "p=(h>=s.night||h<s.day)?'night':(h>=s.evening?'evening':(h>=s.noon?'noon':'day'));}",
    "document.documentElement.setAttribute('data-phase',p);",
    '}catch(e){}})();',
  ].join('');
}
