/** Plain display copy only. Never used to score or authorize a change. */
export function gapSentence(gaps:readonly string[],title=''):string{
 const text=gaps.join(' ').toLowerCase();
 if(/test-writer-coverage|new intent|requested behavior|task.check.*not checked/.test(text))return /readme/i.test(title)?'Done. The README change wasn’t independently checked.':'Done. The requested change wasn’t independently checked.';
 if(/dependency|lockfile/.test(text))return 'Done. Dependency checks couldn’t run.';
 if(/could not run|couldn.t run|unavailable/.test(text))return 'Done. Some automatic checks couldn’t run.';
 return 'Done. Some parts couldn’t be checked.';
}
